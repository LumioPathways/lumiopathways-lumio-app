/**
 * Lumio Pathways — Forgot Password screen
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';

const SUPABASE_URL = 'https://amsmbgeycleatljbqlli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtc21iZ2V5Y2xlYXRsamJxbGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNzk4OTMsImV4cCI6MjEwNTg1NTg5M30.x5TE4OR44NjegkgtY60QK_0btNB3dMgaYbajFiibHqg';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          redirectTo: 'lumio://auth/reset-password',
        }),
      });
      setSent(true);
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
            {sent ? (
              <>
                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.subtitle}>
                  If an account exists for {email}, a password reset link has been sent. Open it on your phone to set a new password.
                </Text>
                <TouchableOpacity style={styles.btn} onPress={() => router.replace('/auth/sign-in')}>
                  <Text style={styles.btnText}>Back to sign in</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>Reset password</Text>
                <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="done"
                  onSubmitEditing={handleSend}
                />

                <TouchableOpacity
                  style={[styles.btn, loading && styles.btnDisabled]}
                  onPress={handleSend}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>Send reset link</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
                  <Text style={styles.backText}>Back to sign in</Text>
                </TouchableOpacity>
              </>
            )}
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
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20 },
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
