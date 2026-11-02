/**
 * Lumio Pathways — Reset Password screen
 * Handles the lumio://auth/reset-password?access_token=... deep link
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { auth } from '../../lib/supabase';

const SUPABASE_URL = 'https://amsmbgeycleatljbqlli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtc21iZ2V5Y2xlYXRsamJxbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNzk4OTMsImV4cCI6MjEwNTg1NTg5M30.x5TE4OR44NjegkgtY60QK_0btNB3dMgaYbajFiibHqg';

export default function ResetPassword() {
  const params = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // The access_token comes in via the deep link query params
    const t = params.access_token as string ?? params.token as string ?? null;
    setToken(t);
    if (!t) {
      Alert.alert('Invalid link', 'This password reset link is invalid or has expired. Please request a new one.');
    }
  }, [params]);

  const handleReset = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    if (!token) {
      Alert.alert('Invalid link', 'No reset token found. Please request a new password reset email.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.message || 'Failed to update password.');
      } else {
        Alert.alert('Success', 'Your password has been updated. Please sign in.', [
          { text: 'Sign in', onPress: () => router.replace('/auth/sign-in') },
        ]);
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              returnKeyType="next"
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />

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
  title: { fontSize: 22, fontWeight: '700', color: NAVY, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
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
  backLink: { alignItems: 'center', marginTop: 16 },
  backText: { color: TEAL, fontWeight: '600', fontSize: 14 },
});
