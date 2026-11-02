/**
 * Lumio Pathways — Stripe Webhook Edge Function
 *
 * This is the SOLE writer to the `subscriptions` table.
 * Deploy: supabase functions deploy stripe-webhook
 *
 * Required environment variables (set in Supabase Dashboard):
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 *   STRIPE_PRICE_ESSENTIAL
 *   STRIPE_PRICE_PLUS
 *   STRIPE_PRICE_CLINICAL
 *   STRIPE_EXTRA_ESSENTIAL
 *   STRIPE_EXTRA_PLUS
 *   STRIPE_EXTRA_CLINICAL
 *   STRIPE_EXTRA_PLUS_FOUNDING    (optional — see open question in brief)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Map Stripe Price IDs to plan names
function resolvePlan(priceId: string): 'essential' | 'plus' | 'clinical' | null {
  const map: Record<string, 'essential' | 'plus' | 'clinical'> = {
    [Deno.env.get('STRIPE_PRICE_ESSENTIAL') ?? '']: 'essential',
    [Deno.env.get('STRIPE_PRICE_PLUS') ?? '']: 'plus',
    [Deno.env.get('STRIPE_PRICE_CLINICAL') ?? '']: 'clinical',
  };
  return map[priceId] ?? null;
}

function isFoundingMemberPrice(priceId: string): boolean {
  // Founding member is identified by the Plus plan; is_founding_member
  // is set once at checkout.session.completed and never changed.
  // If a separate founding price ID is used, add it here.
  return false; // update when founding price ID is confirmed
}

// Write an audit event using the service role
async function audit(
  familyId: string | null,
  eventType: string,
  details: Record<string, unknown>,
) {
  await supabase.from('audit_log').insert({
    actor_id: null,
    actor_role: 'stripe_webhook',
    family_id: familyId,
    child_id: null,
    event_type: eventType,
    details,
  });
}

// ─── Event handlers ────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const familyId = session.metadata?.family_id;

  if (!familyId) {
    console.error('checkout.session.completed: missing family_id in metadata', session.id);
    return;
  }

  // Retrieve the full subscription to get line items and Price IDs
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });

  const mainItem = sub.items.data.find((item) => {
    const priceId = item.price.id;
    return resolvePlan(priceId) !== null;
  });

  if (!mainItem) {
    console.error('checkout.session.completed: cannot resolve plan from price IDs');
    return;
  }

  const plan = resolvePlan(mainItem.price.id)!;
  const extraItem = sub.items.data.find((item) => item.price.id !== mainItem.price.id);
  const extraQty = extraItem?.quantity ?? 0;
  const isFounding = isFoundingMemberPrice(mainItem.price.id) || session.metadata?.founding === 'true';

  const { error } = await supabase.from('subscriptions').upsert(
    {
      family_id: familyId,
      plan,
      is_founding_member: isFounding,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      extra_child_quantity: extraQty,
      status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      main_price_id: mainItem.price.id,
      extra_child_price_id: extraItem?.price.id ?? null,
    },
    { onConflict: 'family_id' },
  );

  if (error) {
    console.error('subscriptions upsert error:', error);
    throw error;
  }

  await audit(familyId, 'plan_changed', {
    plan,
    stripe_subscription_id: subscriptionId,
    is_founding_member: isFounding,
    trigger: 'checkout_completed',
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  // Find family by customer ID
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('family_id, plan, is_founding_member')
    .eq('stripe_subscription_id', sub.id)
    .single();

  if (!existing) {
    // Not yet in our DB (race with checkout.session.completed); skip
    console.warn('subscription.updated: no matching row for', sub.id);
    return;
  }

  const mainItem = sub.items.data.find((item) => resolvePlan(item.price.id) !== null);
  const extraItem = sub.items.data.find((item) => item !== mainItem);
  const newPlan = mainItem ? resolvePlan(mainItem.price.id) : existing.plan;
  const extraQty = extraItem?.quantity ?? 0;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan: newPlan ?? existing.plan,
      status: sub.status,
      extra_child_quantity: extraQty,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      main_price_id: mainItem?.price.id ?? null,
      extra_child_price_id: extraItem?.price.id ?? null,
    })
    .eq('stripe_subscription_id', sub.id);

  if (error) throw error;

  if (newPlan && newPlan !== existing.plan) {
    await audit(existing.family_id, 'plan_changed', {
      from: existing.plan,
      to: newPlan,
      stripe_subscription_id: sub.id,
      trigger: 'subscription_updated',
    });

    // If downgraded, end clinical assignments the new plan doesn't cover
    await endIneligibleAssignments(existing.family_id, newPlan);
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('family_id')
    .eq('stripe_subscription_id', sub.id)
    .single();

  if (!existing) return;

  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', current_period_end: new Date(sub.current_period_end * 1000).toISOString() })
    .eq('stripe_subscription_id', sub.id);

  await audit(existing.family_id, 'plan_changed', {
    to: 'canceled',
    stripe_subscription_id: sub.id,
    trigger: 'subscription_deleted',
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Keep status and period in sync on renewal
  const subId = invoice.subscription as string;
  if (!subId) return;

  const sub = await stripe.subscriptions.retrieve(subId);

  await supabase
    .from('subscriptions')
    .update({
      status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subId);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subId = invoice.subscription as string;
  if (!subId) return;

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('family_id')
    .eq('stripe_subscription_id', subId)
    .single();

  await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subId);

  if (existing) {
    await audit(existing.family_id, 'payment_failed', {
      stripe_invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
    });
  }
}

// End clinical assignments that the downgraded plan no longer supports
async function endIneligibleAssignments(
  familyId: string,
  newPlan: 'essential' | 'plus' | 'clinical',
) {
  const allowedRoles: string[] = [];
  if (newPlan === 'plus' || newPlan === 'clinical') allowedRoles.push('slt', 'clinical_coordinator');
  if (newPlan === 'clinical') allowedRoles.push('paediatrician');

  // End assignments for roles the new plan does not cover
  const { data: assignments } = await supabase
    .from('clinical_assignments')
    .select('id, clinician_id, clinical_role')
    .eq('family_id', familyId)
    .is('ends_at', null);

  if (!assignments) return;

  const toEnd = assignments.filter((a) => !allowedRoles.includes(a.clinical_role));
  if (toEnd.length === 0) return;

  await supabase
    .from('clinical_assignments')
    .update({ ends_at: new Date().toISOString() })
    .in('id', toEnd.map((a) => a.id));

  for (const a of toEnd) {
    await audit(familyId, 'clinician_unassigned', {
      clinician_id: a.clinician_id,
      clinical_role: a.clinical_role,
      reason: 'plan_downgraded',
    });
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        // created fires alongside checkout.session.completed; handled there
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Error processing webhook event', event.type, err);
    return new Response('Internal error', { status: 500 });
  }
});
