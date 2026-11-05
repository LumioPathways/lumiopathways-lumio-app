/**
 * Lumio Pathways — Settings screen
 * Accessible from the avatar button on the parent dashboard.
 * Covers: account info, plan, notifications, privacy, sign out.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { auth, from, getUserId, getUserEmail } from '../lib/supabase';

type UserProfile = {
  full_name: string;
  role: string;
};

const PLAN_LABELS: Record<string, string> = {
  none: 'Free',
  free: 'Free',
  essential: 'Essential — £14.99/mo',
  plus: 'Plus — £79.99/mo',
  clinical: 'Clinical — £99.99/mo',
};

const NAVY = '#0D2137';
const AMBER = '#F5A623';
const TEAL = '#1B4D4A';

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activePlan, setActivePlan] = useState<string>('none');
  const email = getUserEmail();
  const userId = getUserId();

  useEffect(() => {
    if (!userId) return;

    // Load basic profile info
    from('user_profiles').select('full_name, role').eq('user_id', userId).single()
      .then(({ data }) => {
        if (data) setProfile(data as UserProfile);
      });

    // Load active plan from subscriptions table (source of truth after payment)
    from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setActivePlan((data[0] as any).plan ?? 'none');
        } else {
          setActivePlan('none');
        }
      });
  }, [userId]);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          await auth.signOut();
          router.replace('/auth/sign-in');
        },
      },
    ]);
  };

  const Row = ({
    emoji, label, sublabel, onPress, danger,
  }: { emoji: string; label: string; sublabel?: string; onPress?: () => void; danger?: boolean }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: '#EF4444' }]}>{label}</Text>
        {sublabel ? <Text style={styles.rowSub}>{sublabel}</Text> : null}
      </View>
      {onPress ? <Text style={styles.rowArrow}>›</Text> : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.wordmark}>Lumio</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Avatar */}
        <View style={styles.avatarBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>
              {((profile?.full_name || email || '?')[0]).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>{profile?.full_name || email?.split('@')[0]}</Text>
          <Text style={styles.emailText}>{email}</Text>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>
              {PLAN_LABELS[activePlan] ?? 'Free'}
            </Text>
          </View>
        </View>

        {/* Account */}
        <Text style={styles.section}>Account</Text>
        <View style={styles.card}>
          <Row emoji="👤" label="Full name" sublabel={profile?.full_name || '—'} />
          <View style={styles.divider} />
          <Row emoji="📧" label="Email" sublabel={email ?? '—'} />
        </View>

        {/* Plan */}
        <Text style={styles.section}>Subscription</Text>
        <View style={styles.card}>
          <Row
            emoji="⭐"
            label="Current plan"
            sublabel={PLAN_LABELS[activePlan] ?? 'Free'}
            onPress={() => router.push('/plan-select')}
          />
        </View>

        {/* Notifications */}
        <Text style={styles.section}>Notifications</Text>
        <View style={styles.card}>
          <Row
            emoji="🔔"
            label="Daily positives"
            sublabel="Affirmations and activity reminders"
            onPress={() => router.push('/notifications-prefs')}
          />
        </View>

        {/* Privacy & Legal */}
        <Text style={styles.section}>Privacy & Legal</Text>
        <View style={styles.card}>
          <Row
            emoji="🔒"
            label="Privacy policy"
            onPress={() => router.push('/privacy-policy')}
          />
          <View style={styles.divider} />
          <Row
            emoji="📋"
            label="Cookie preferences"
            sublabel="Manage what we can track"
            onPress={() => Alert.alert(
              'Cookie preferences',
              'We use functional cookies to keep you signed in and optional analytics to improve the app. You accepted or declined these on first launch.\n\nTo change your preference, please contact privacy@lumiopathways.co.uk.',
            )}
          />
        </View>

        {/* Sign out */}
        <Text style={styles.section}>Account actions</Text>
        <View style={styles.card}>
          <Row emoji="🚪" label="Sign out" onPress={handleSignOut} danger />
        </View>

        <Text style={styles.version}>Lumio Pathways · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: NAVY,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: 'rgba(255,255,255,0.7)' },
  wordmark: { fontSize: 20, fontWeight: '800', color: '#ffffff', letterSpacing: -1 },
  container: { paddingHorizontal: 20, paddingBottom: 60 },
  avatarBlock: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarInitial: { fontSize: 30, fontWeight: '800', color: '#ffffff' },
  displayName: { fontSize: 20, fontWeight: '700', color: '#ffffff', marginBottom: 2 },
  emailText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 10 },
  planBadge: { backgroundColor: AMBER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  planBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  section: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 24, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 52 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: NAVY },
  rowSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  rowArrow: { fontSize: 20, color: '#D1D5DB' },
  version: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 32 },
});
