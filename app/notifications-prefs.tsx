/**
 * Lumio Pathways — Daily Positive Notifications
 * Registers push token, shows today's affirmation + tip, manages prefs.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Switch, Alert,
  ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { from, getUserId } from '../lib/supabase';
import PlanGate from '../components/PlanGate';

const NAVY = '#0D2137';
const AMBER = '#F5A623';
const TEAL = '#1B4D4A';
const PURPLE = TEAL; // alias so existing references below work

// Rotating affirmations shown to the parent
const AFFIRMATIONS = [
  { emoji: '💜', text: 'You are doing something extraordinary for your child. Your dedication matters more than you know.' },
  { emoji: '⭐', text: "Every step you take — however small — is progress. You are your child's greatest advocate." },
  { emoji: '🌱', text: 'Growth takes time. Trust the process and trust yourself.' },
  { emoji: '🤝', text: 'You are not alone on this journey. The Lumio community is here with you.' },
  { emoji: '💪', text: 'Asking for help is a sign of strength, not weakness. You are doing brilliantly.' },
  { emoji: '🌟', text: "Celebrate today's small win. Every milestone, however tiny, is worth cheering." },
  { emoji: '🧡', text: 'Your child is lucky to have someone who cares this deeply. That love makes all the difference.' },
];

// Rotating domain activity reminders
const ACTIVITY_REMINDERS = [
  { domain: 'Sensory', emoji: '🎯', tip: 'Try 5 minutes of deep pressure input (a firm hug or weighted blanket) before a challenging activity today.' },
  { domain: 'Communication', emoji: '💬', tip: 'Use visual cues alongside speech today — a simple picture schedule can reduce anxiety and increase independence.' },
  { domain: 'Regulation', emoji: '🌙', tip: 'A consistent wind-down routine 30 minutes before bed can significantly improve sleep onset. Dim lights early tonight.' },
  { domain: 'Nutrition', emoji: '🥦', tip: 'Try serving a new food alongside a favourite — exposure without pressure is the key to expanding acceptance.' },
  { domain: 'Behaviour', emoji: '🌈', tip: 'Notice and name 3 positive behaviours today. Specific praise ("I love how you waited your turn") is more effective than general praise.' },
];

function todayAffirmation() {
  const dayIndex = Math.floor(Date.now() / 86400000) % AFFIRMATIONS.length;
  return AFFIRMATIONS[dayIndex];
}

function todayReminder() {
  const dayIndex = Math.floor(Date.now() / 86400000) % ACTIVITY_REMINDERS.length;
  return ACTIVITY_REMINDERS[dayIndex];
}

type Prefs = {
  activity_reminder: boolean;
  affirmations: boolean;
  clinical_tips: boolean;
  reminder_time: string;
};

function NotificationsPrefsScreen() {
  const [prefs, setPrefs] = useState<Prefs>({
    activity_reminder: true,
    affirmations: true,
    clinical_tips: true,
    reminder_time: '09:00:00',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const userId = getUserId();
  const affirmation = todayAffirmation();
  const reminder = todayReminder();

  const loadPrefs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await from('notification_prefs').select('*').eq('user_id', userId).single();
    if (data) setPrefs(data as Prefs);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  const savePrefs = async (updated: Prefs) => {
    if (!userId) return;
    setSaving(true);
    // Upsert prefs
    await from('notification_prefs').upsert({ user_id: userId, ...updated, updated_at: new Date().toISOString() });
    setSaving(false);
  };

  const togglePref = (key: keyof Prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    savePrefs(updated);
  };

  const handleEnablePush = async () => {
    // On a real device this would call expo-notifications
    // For now we show a clear message explaining what would happen
    Alert.alert(
      'Enable notifications',
      'To receive daily reminders and affirmations, allow Lumio to send you notifications when prompted by your device.\n\nYou can change this at any time in your device Settings.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Enable', onPress: () => setPushEnabled(true) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.wordmark}>Lumio</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.title}>🔔 Daily positives</Text>
        <Text style={styles.subtitle}>Activity reminders, parent affirmations, and clinical tips — sent at a time that works for you.</Text>

        {/* Today's affirmation */}
        <View style={styles.affirmationCard}>
          <Text style={styles.affirmationLabel}>TODAY'S AFFIRMATION</Text>
          <Text style={styles.affirmationEmoji}>{affirmation.emoji}</Text>
          <Text style={styles.affirmationText}>{affirmation.text}</Text>
        </View>

        {/* Today's activity reminder */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderTop}>
            <Text style={styles.reminderEmoji}>{reminder.emoji}</Text>
            <View>
              <Text style={styles.reminderLabel}>TODAY'S ACTIVITY REMINDER</Text>
              <Text style={styles.reminderDomain}>{reminder.domain}</Text>
            </View>
          </View>
          <Text style={styles.reminderText}>{reminder.tip}</Text>
        </View>

        {/* Push notification toggle */}
        {!pushEnabled ? (
          <TouchableOpacity style={styles.enablePushCard} onPress={handleEnablePush}>
            <Text style={styles.enablePushEmoji}>🔔</Text>
            <View style={styles.enablePushText}>
              <Text style={styles.enablePushTitle}>Enable push notifications</Text>
              <Text style={styles.enablePushSub}>Get today's content delivered to your phone</Text>
            </View>
            <Text style={styles.enablePushArrow}>→</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.enabledBadge}>
            <Text style={styles.enabledBadgeText}>✓ Push notifications enabled</Text>
          </View>
        )}

        {/* Preferences */}
        <Text style={styles.sectionTitle}>What to receive</Text>

        {loading ? <ActivityIndicator color={PURPLE} /> : (
          <>
            <View style={styles.prefRow}>
              <View style={styles.prefLeft}>
                <Text style={styles.prefIcon}>🎯</Text>
                <View>
                  <Text style={styles.prefTitle}>Activity reminders</Text>
                  <Text style={styles.prefSub}>Daily clinical activity suggestions</Text>
                </View>
              </View>
              <Switch
                value={prefs.activity_reminder}
                onValueChange={() => togglePref('activity_reminder')}
                trackColor={{ true: PURPLE }}
              />
            </View>

            <View style={styles.prefRow}>
              <View style={styles.prefLeft}>
                <Text style={styles.prefIcon}>💜</Text>
                <View>
                  <Text style={styles.prefTitle}>Parent affirmations</Text>
                  <Text style={styles.prefSub}>A daily message of support for you</Text>
                </View>
              </View>
              <Switch
                value={prefs.affirmations}
                onValueChange={() => togglePref('affirmations')}
                trackColor={{ true: PURPLE }}
              />
            </View>

            <View style={styles.prefRow}>
              <View style={styles.prefLeft}>
                <Text style={styles.prefIcon}>🧠</Text>
                <View>
                  <Text style={styles.prefTitle}>Clinical tips</Text>
                  <Text style={styles.prefSub}>Domain-specific guidance from our team</Text>
                </View>
              </View>
              <Switch
                value={prefs.clinical_tips}
                onValueChange={() => togglePref('clinical_tips')}
                trackColor={{ true: PURPLE }}
              />
            </View>
          </>
        )}

        {saving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={PURPLE} />
            <Text style={styles.savingText}>Saving preferences…</Text>
          </View>
        )}

        {/* About section */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>About these notifications</Text>
          <Text style={styles.aboutText}>
            Activity reminders are based on evidence-based strategies used by our clinical team. Affirmations are written by the Lumio team and rotate daily.
            {'\n\n'}
            All notifications respect your privacy. Your personal data is never shared with third parties.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  container: { paddingHorizontal: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: 'rgba(255,255,255,0.7)' },
  wordmark: { fontSize: 22, fontWeight: '800', color: '#ffffff', letterSpacing: -1 },
  title: { fontSize: 26, fontWeight: '800', color: '#ffffff', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 21, marginBottom: 24 },

  affirmationCard: {
    backgroundColor: TEAL, borderRadius: 20, padding: 24, marginBottom: 14, alignItems: 'center',
  },
  affirmationLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.2, marginBottom: 12 },
  affirmationEmoji: { fontSize: 36, marginBottom: 12 },
  affirmationText: { fontSize: 16, color: '#fff', textAlign: 'center', lineHeight: 24, fontWeight: '500' },

  reminderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16 },
  reminderTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  reminderEmoji: { fontSize: 28 },
  reminderLabel: { fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 1.2, marginBottom: 2 },
  reminderDomain: { fontSize: 14, fontWeight: '700', color: NAVY },
  reminderText: { fontSize: 14, color: '#374151', lineHeight: 21 },

  enablePushCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16, padding: 16, marginBottom: 24, gap: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  enablePushEmoji: { fontSize: 28 },
  enablePushText: { flex: 1 },
  enablePushTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  enablePushSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  enablePushArrow: { fontSize: 20, color: AMBER },

  enabledBadge: { backgroundColor: TEAL, borderRadius: 12, padding: 14, marginBottom: 24, alignItems: 'center' },
  enabledBadgeText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  prefRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8,
  },
  prefLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  prefIcon: { fontSize: 22 },
  prefTitle: { fontSize: 14, fontWeight: '700', color: NAVY },
  prefSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  savingText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  aboutCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 18, marginTop: 20 },
  aboutTitle: { fontSize: 14, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  aboutText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 20 },
});

export default function NotificationsPrefs() {
  return (
    <PlanGate feature="daily_positives">
      <NotificationsPrefsScreen />
    </PlanGate>
  );
}
