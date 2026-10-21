/**
 * Lumio Pathways — Assessment Results screen
 *
 * Displays domain scores, the priority need area, and a call to action
 * (share with clinician / subscribe for the full report).
 */
import React, { useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

const DOMAIN_LABELS: Record<string, string> = {
  sensory: 'Sensory processing',
  behaviour: 'Behaviour & routine',
  communication: 'Communication',
  nutrition: 'Nutrition & growth',
  regulation: 'Sleep & regulation',
};

const DOMAIN_COLORS: Record<string, string> = {
  sensory: '#FBBF24',
  behaviour: '#60A5FA',
  communication: '#34D399',
  nutrition: '#F87171',
  regulation: '#A78BFA',
};

const DOMAIN_EMOJIS: Record<string, string> = {
  sensory: '🟡',
  behaviour: '🔵',
  communication: '🟢',
  nutrition: '🔴',
  regulation: '🟣',
};

export default function Results() {
  const { childName = 'your child', ageBand = '', scores: scoresParam } = useLocalSearchParams<{
    childName: string;
    ageBand: string;
    scores: string;
  }>();

  const scores: Record<string, number> = useMemo(() => {
    try { return scoresParam ? JSON.parse(scoresParam) : {}; } catch { return {}; }
  }, [scoresParam]);

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topNeed = sorted[0]?.[0] ?? '';
  const strength = sorted[sorted.length - 1]?.[0] ?? '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>Lumio</Text>
        </View>

        <Text style={styles.completedTag}>✓ Assessment complete</Text>
        <Text style={styles.title}>{childName}'s profile</Text>
        <Text style={styles.ageBand}>{ageBand}</Text>

        {/* Domain bars */}
        <View style={styles.barsSection}>
          {sorted.map(([domain, pct]) => (
            <View key={domain} style={styles.barRow}>
              <Text style={styles.barLabel}>
                {DOMAIN_EMOJIS[domain]} {DOMAIN_LABELS[domain] ?? domain}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: DOMAIN_COLORS[domain] ?? '#FBBF24',
                    },
                  ]}
                />
              </View>
              <Text style={styles.barPct}>{pct}%</Text>
            </View>
          ))}
        </View>

        {/* Summary card */}
        {topNeed ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryHeading}>Priority support area</Text>
            <Text style={styles.summaryDomain}>
              {DOMAIN_EMOJIS[topNeed]} {DOMAIN_LABELS[topNeed] ?? topNeed}
            </Text>
            <Text style={styles.summaryText}>
              Based on your answers, {childName} would benefit most from support
              in this area. A Lumio clinician can create a personalised plan.
            </Text>
          </View>
        ) : null}

        {strength ? (
          <View style={styles.strengthCard}>
            <Text style={styles.strengthHeading}>Relative strength</Text>
            <Text style={styles.strengthDomain}>
              {DOMAIN_EMOJIS[strength]} {DOMAIN_LABELS[strength] ?? strength}
            </Text>
          </View>
        ) : null}

        {/* CTAs */}
        <TouchableOpacity style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Get the full report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace('/onboarding')}
        >
          <Text style={styles.secondaryBtnText}>Assess another child</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const AMBER = '#F59E0B';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFBEB' },
  container: { paddingHorizontal: 24, paddingBottom: 48 },

  header: { alignItems: 'center', paddingTop: 24, marginBottom: 24 },
  wordmark: { fontSize: 28, fontWeight: '800', color: AMBER, letterSpacing: -1 },

  completedTag: { color: '#10B981', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 4 },
  ageBand: { fontSize: 14, color: '#6B7280', marginBottom: 28 },

  barsSection: { gap: 16, marginBottom: 28 },
  barRow: { gap: 6 },
  barLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  barTrack: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: { height: 12, borderRadius: 6 },
  barPct: { fontSize: 12, color: '#6B7280', textAlign: 'right' },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: AMBER,
  },
  summaryHeading: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  summaryDomain: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  summaryText: { fontSize: 14, color: '#6B7280', lineHeight: 21 },

  strengthCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderLeftWidth: 4,
    borderLeftColor: '#34D399',
  },
  strengthHeading: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  strengthDomain: { fontSize: 18, fontWeight: '700', color: '#111827' },

  primaryBtn: {
    backgroundColor: AMBER,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },

  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#374151', fontWeight: '600', fontSize: 16 },
});
