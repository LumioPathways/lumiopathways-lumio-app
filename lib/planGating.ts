/**
 * Lumio Pathways — Plan gating utility
 *
 * Subscription tiers:
 *   none / free  → Assessment + Results + Journey (read-only)
 *   essential    → + Community + Daily Positives + Activity Tracker
 *   plus         → + Nutrition + Book Appointment + GP Letter + DLA guidance
 *   clinical     → + SLT prescription flow + EHCP tracker
 *
 * Usage:
 *   const { hasAccess, plan } = usePlan();
 *   if (!hasAccess('plus')) { router.push('/plan-select'); return; }
 */

import { useEffect, useState } from 'react';
import { from, getUserId } from './supabase';

export type Plan = 'none' | 'essential' | 'plus' | 'clinical';

// Feature → minimum plan required
export const FEATURE_PLANS: Record<string, Plan> = {
  // Essential features
  community: 'essential',
  daily_positives: 'essential',
  activity_tracker: 'essential',
  // Plus features
  nutrition: 'plus',
  book_appointment: 'plus',
  gp_letter: 'plus',
  dla_guidance: 'plus',
  // Clinical features
  slt_prescription: 'clinical',
  ehcp_tracker: 'clinical',
};

const PLAN_RANK: Record<Plan, number> = {
  none: 0,
  essential: 1,
  plus: 2,
  clinical: 3,
};

export function hasFeatureAccess(userPlan: Plan, feature: string): boolean {
  const required = FEATURE_PLANS[feature];
  if (!required) return true; // unlisted features are free
  return PLAN_RANK[userPlan] >= PLAN_RANK[required];
}

export function usePlan() {
  const [plan, setPlan] = useState<Plan>('none');
  const [loading, setLoading] = useState(true);
  const userId = getUserId();

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    from('user_profiles')
      .select('plan')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        const p = (data as any)?.plan as Plan;
        setPlan(p && PLAN_RANK[p] !== undefined ? p : 'none');
        setLoading(false);
      });
  }, [userId]);

  return {
    plan,
    loading,
    hasAccess: (feature: string) => hasFeatureAccess(plan, feature),
  };
}

// Human-readable plan descriptions for upgrade prompts
export const PLAN_DESCRIPTIONS: Record<Plan, { name: string; price: string; features: string[] }> = {
  none: {
    name: 'Free',
    price: '£0',
    features: ['SEN assessment', 'Domain scores & results', 'Journey map (read-only)'],
  },
  essential: {
    name: 'Essential',
    price: '£14.99/mo',
    features: ['Everything in Free', 'Community forum', 'Daily positives & affirmations', 'SLT activity tracker'],
  },
  plus: {
    name: 'Plus',
    price: '£79.99/mo',
    features: ['Everything in Essential', 'Nutrition module & food diary', 'Book appointments', 'GP referral letter generator', 'DLA application guidance'],
  },
  clinical: {
    name: 'Clinical',
    price: '£99.99/mo',
    features: ['Everything in Plus', 'SLT prescription flow', 'EHCP tracker', 'Clinical dashboard', 'Multi-child management'],
  },
};
