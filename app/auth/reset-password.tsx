/**
 * Lumio Pathways — Reset Password screen
 * Token is read from RecoveryContext (set by _layout.tsx from the deep link hash).
 * The screen subscribes to React state so it re-renders when the token arrives
 * asynchronously (app-already-open case).
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRecovery } from '../../lib/recoveryContext';
import { clearPendingRecovery } from '../_layout';

const SUPABASE_URL = 'https://amsmbgeycleatljbqlli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtc21iZ2V5Y2xlYXRsamJxbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNzk4OTMsImV4cCI6MjEwNTg1NTg5M30.x5TE4OR44NjegkgtY60QK_0btNB3dMgaYbajFiibHqg';

type ScreenState = 'waiting' | 'form' | 'success' | 'error';

export default function ResetPassword() {
  const { recovery, clearRecovery } = useRecovery();
  // Route params are synchronously available on mount — no race condition.
  // This is the primary token source; context is the fallback for the
  // already-open-app case where navigate fires before params arrive.
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>();

  // Resolve the token: route param wins (available immediately on mount),
  // then context (async, may arrive slightly later).
  const accessToken = params.access_token || recovery?.access_token || null;
  const refreshToken = params.refresh_token || recovery?.refresh_token || undefined;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState<ScreenState>('waiting');
  const [errorMsg, setErrorMsg] = useState('');
  const [validationErr, setValidationErr] = useState('');

  useEffect(() => {
    if (screen !== 'waiting') return;

    if (accessToken) {
      // Token is here — show the form immediately
      setScreen('form');
      return;
    }

    // Safety net: wait up to 3 seconds in case context arrives asynchronously
    const timeout = setTimeout(() => {
      if (!accessToken) {
        setErrorMsg('This password reset link is invalid or has expired. Please request a new one.');
        setScreen('error');
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [accessToken, screen]);

  const validate = () => {
    if (!password || password.length < 8) {
      setValidationErr('Password must be at least 8 characters.');
      return false;
    }
    if (password !== confirm) {
      setValidationErr('Passwords do not match.');
      return false;
    }
    setValidationErr('');
    return true;
  };

  const handleReset = async () => {
    if (!validate()) return;
    if (!accessToken) return;

    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || data.message?.toLowerCase().includes('expired')) {
          setErrorMsg('Your password reset link has expired. Please request a new password reset email.');
        } else {
          setErrorMsg(data.message || 'Unable to update password. Please try again.');
        }
        setScreen('error');
      } else {
        clearRecovery();
        clearPendingRecovery();
        setScreen('success');
      }
    } catch {
      setErrorMsg('Unable to connect. Please check your connection and try again.');
      setScreen('error');
    } finally {
      setLoading(false);
    }
  };

  if (screen === 'waiting') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centred}>
          <ActivityIndicator size="large" color="#F5A623" />
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'success') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centred}>
          <View style={styles.card}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.title}>Password updated</Text>
            <Text style={styles.subtitle}>
              Your password has been updated successfully. Please sign in using your new password.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/auth/sign-in')}>
              <Text style={styles.btnText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'error') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centred}>
          <View style={styles.card}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.title}>Link problem</Text>
            <Text style={styles.subtitle}>{errorMsg}</Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/auth/forgot-password')}>
              <Text style={styles.btnText}>Request new link</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/auth/sign-in')} style={styles.backLink}>
              <Text style={styles.backText}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.wordmark}>Lumio</Text>
            <Text style={styles.tagline}>SEN Assessment</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Set new password</Text>
            <Text style={styles.subtitle}>Enter a new password for your account.</Text>

            <Text style={styles.label}>New password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={v => { setPassword(v); setValidationErr(''); }}
              placeholder="At least 8 characters"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              returnKeyType="next"
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={v => { setConfirm(v); setValidationErr(''); }}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />

            {validationErr ? (
              <Text style={styles.validationErr}>{validationErr}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Update password</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace('/auth/sign-in')} style={styles.backLink}>
              <Text style={styles.backText}>Back to sign in</Text>
            </TouchableOpacity>
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
  centred: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
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
  successIcon: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  errorIcon: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: NAVY, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20, textAlign: 'center' },
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
  validationErr: { color: '#EF4444', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  btn: {
    backgroundColor: AMBER,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backLink: { alignItems: 'center', marginTop: 16 },
  backText: { color: TEAL, fontWeight: '600', fontSize: 14 },
});
