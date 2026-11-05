/**
 * Lumio Pathways — Sign In screen
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Keyboard, ScrollView,
} from 'react-native';
import { router, Link } from 'expo-router';
import { auth, from, getUserId } from '../../lib/supabase';
import { clearPendingRecovery } from '../_layout';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    console.log('[SignIn] email:', JSON.stringify(email), 'password length:', password.length);
    if (!email.trim() || !password) {
      Alert.alert('Missing details', `Email: "${email.trim()}" Password length: ${password.length}`);
      return;
    }
    setLoading(true);
    clearPendingRecovery();
    const { error } = await auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) {
      Alert.alert('Sign in failed', JSON.stringify(error));
      return;
    }
    // Re-fetch session to ensure userId is available after sign-in
    await new Promise(resolve => setTimeout(resolve, 300));
    const { data: sessionData } = await auth.getSession();
    const userId = sessionData?.session?.user?.id ?? getUserId();

    Alert.alert('DEBUG', `userId: ${userId ?? 'null'}\nsession: ${sessionData?.session ? 'yes' : 'no'}`);

    if (userId) {
      const { data: staffRows, error: staffError } = await from('staff_roles')
        .select('role')
        .eq('user_id', userId);

      Alert.alert('DEBUG roles', `rows: ${JSON.stringify(staffRows)}\nerr: ${JSON.stringify(staffError)}`);

      if (Array.isArray(staffRows) && staffRows.length > 0) {
        const roles = staffRows.map((r: any) => r.role);
        if (roles.includes('super_admin') || roles.includes('support') || roles.includes('content_reviewer')) {
          router.replace('/dashboard/admin'); return;
        }
        if (roles.includes('clinical_lead') || roles.includes('paediatrician')) {
          router.replace('/dashboard/clinician'); return;
        }
        if (roles.includes('slt') || roles.includes('clinical_coordinator')) {
          router.replace('/dashboard/slt'); return;
        }
      }
    }
    // Default: parent / family onboarding
    router.replace('/onboarding');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Wordmark */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>Lumio</Text>
          <Text style={styles.tagline}>SEN Assessment</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Sign in</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/auth/forgot-password')} style={styles.forgotLink}>
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/auth/sign-up">
              <Text style={styles.link}>Create one</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const NAVY = '#0D2137';
const AMBER = '#F5A623';
const TEAL = '#1B4D4A';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  wordmark: { fontSize: 36, fontWeight: '800', color: '#ffffff', letterSpacing: -1 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 4, letterSpacing: 0.5 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: NAVY, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  btn: {
    backgroundColor: AMBER,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  eyeBtn: { paddingHorizontal: 8, paddingVertical: 13 },
  eyeText: { fontSize: 20 },
  forgotLink: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#6B7280', fontSize: 14 },
  link: { color: TEAL, fontWeight: '600', fontSize: 14 },
});
