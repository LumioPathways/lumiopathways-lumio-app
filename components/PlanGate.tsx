/**
 * Lumio Pathways — PlanGate component
 *
 * Wrap any gated screen with this. If the user's plan doesn't have access
 * to `feature`, they see a friendly upgrade card instead of the screen content.
 *
 * Usage:
 *   <PlanGate feature="nutrition">
 *     <NutritionContent />
 *   </PlanGate>
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { usePlan, PLAN_DESCRIPTIONS, FEATURE_PLANS, Plan } from '../lib/planGating';

type Props = {
  feature: string;
  children: React.ReactNode;
};

const NAVY = '#0D2137';
const AMBER = '#F5A623';
const TEAL = '#1B4D4A';

export default function PlanGate({ feature, children }: Props) {
  const { plan, loading, hasAccess } = usePlan();

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={TEAL} />
      </SafeAreaView>
    );
  }

  if (hasAccess(feature)) {
    return <>{children}</>;
  }

  // Show upgrade prompt
  const requiredPlan = FEATURE_PLANS[feature] as Plan;
  const planInfo = PLAN_DESCRIPTIONS[requiredPlan];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>Lumio</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.container}>
        <Text style={styles.lockEmoji}>🔒</Text>
        <Text style={styles.title}>{planInfo.name} plan required</Text>
        <Text style={styles.subtitle}>
          Upgrade to {planInfo.name} at {planInfo.price} to unlock this feature.
        </Text>

        <View style={styles.featureList}>
          {planInfo.features.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureTick}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.upgradeBtn}
          onPress={() => router.push('/plan-select')}
        >
          <Text style={styles.upgradeBtnText}>View plans</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: NAVY },
  safe: { flex: 1, backgroundColor: NAVY },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: 'rgba(255,255,255,0.7)' },
  wordmark: { fontSize: 20, fontWeight: '800', color: '#ffffff', letterSpacing: -1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  lockEmoji: { fontSize: 52, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  featureList: {
    alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: 16,
    padding: 20, marginBottom: 28,
  },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  featureTick: { fontSize: 15, color: TEAL, fontWeight: '800', marginTop: 1 },
  featureText: { fontSize: 14, color: '#374151', flex: 1, lineHeight: 20 },
  upgradeBtn: {
    backgroundColor: AMBER, borderRadius: 16, paddingVertical: 16,
    paddingHorizontal: 40, alignSelf: 'stretch', alignItems: 'center', marginBottom: 12,
  },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backLink: { paddingVertical: 8 },
  backLinkText: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
});
