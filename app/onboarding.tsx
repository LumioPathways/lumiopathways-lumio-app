/**
 * Lumio Pathways — Onboarding / "Before we begin"
 *
 * Collects the child's name and age band before the assessment.
 * Matches the Snack prototype's first screen exactly.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';

export type AgeBand =
  | 'Under 2' | '2 to 3' | '3 to 5'
  | '5 to 7' | '7 to 9' | '9 to 12' | '12 plus';

const AGE_BANDS: AgeBand[] = [
  'Under 2', '2 to 3', '3 to 5',
  '5 to 7', '7 to 9', '9 to 12', '12 plus',
];

export default function Onboarding() {
  const [childName, setChildName] = useState('');
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);

  const canStart = childName.trim().length > 0 && ageBand !== null;

  const handleStart = () => {
    if (!canStart) return;
    // Pass child info to assessment via URL params
    router.push({
      pathname: '/assessment',
      params: { childName: childName.trim(), ageBand: ageBand! },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.logoRow}>
            <Text style={styles.logoText}>Lumio</Text>
          </View>

          <Text style={styles.heading}>Before we begin,</Text>
          <Text style={styles.subheading}>
            Tell us about your child so we can calibrate the{'\n'}assessment accurately.
          </Text>

          {/* Child name */}
          <Text style={styles.label}>Your child's first name</Text>
          <TextInput
            style={styles.input}
            value={childName}
            onChangeText={setChildName}
            placeholder="e.g. Amara"
            placeholderTextColor="#D1D5DB"
            autoCapitalize="words"
            returnKeyType="done"
          />

          {/* Age band */}
          <Text style={styles.label}>Your child's age</Text>
          <View style={styles.ageBandGrid}>
            {AGE_BANDS.map((band) => (
              <TouchableOpacity
                key={band}
                style={[
                  styles.ageBandBtn,
                  ageBand === band && styles.ageBandBtnActive,
                ]}
                onPress={() => setAgeBand(band)}
              >
                <Text
                  style={[
                    styles.ageBandText,
                    ageBand === band && styles.ageBandTextActive,
                  ]}
                >
                  {band}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
            onPress={handleStart}
            disabled={!canStart}
          >
            <Text style={styles.startBtnText}>Start the assessment</Text>
          </TouchableOpacity>

          <Text style={styles.privacyNote}>
            🔒 Your answers are private and encrypted.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const AMBER = '#F59E0B';
const AMBER_DARK = '#D97706';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  logoRow: { alignItems: 'center', marginBottom: 32 },
  logoText: { fontSize: 30, fontWeight: '800', color: AMBER, letterSpacing: -1 },

  heading: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subheading: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 32 },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },

  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 28,
  },

  ageBandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 36,
  },
  ageBandBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  ageBandBtnActive: {
    backgroundColor: AMBER,
    borderColor: AMBER,
  },
  ageBandText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  ageBandTextActive: { color: '#fff', fontWeight: '700' },

  startBtn: {
    backgroundColor: AMBER,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: AMBER_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  startBtnDisabled: { opacity: 0.45 },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 0.2 },

  privacyNote: { textAlign: 'center', color: '#9CA3AF', fontSize: 13 },
});
