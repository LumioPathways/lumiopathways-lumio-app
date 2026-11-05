import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { router } from 'expo-router';
import { RecoveryProvider, useRecovery } from '../lib/recoveryContext';
import CookieBanner from '../components/CookieBanner';

enableScreens(false);

// Boolean flag for index.tsx bail-out only — not the token
export let pendingRecovery: boolean = false;

function parseFragment(url: string): Record<string, string> {
  const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
  const result: Record<string, string> = {};
  (fragment ?? '').split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) result[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  });
  return result;
}

function RootLayoutInner() {
  const { setRecovery } = useRecovery();

  const handleDeepLink = (url: string, navigate = true): boolean => {
    const params = parseFragment(url);
    if (params.type === 'recovery' && params.access_token) {
      pendingRecovery = true;
      setRecovery({ access_token: params.access_token, refresh_token: params.refresh_token });
      if (navigate) {
        router.replace('/auth/reset-password');
      }
      return true;
    }
    return false;
  };

  useEffect(() => {
    // Case 1: app launched cold — get the initial URL
    Linking.getInitialURL().then(url => {
      if (url) {
        const isRecovery = handleDeepLink(url, false);
        if (isRecovery) {
          setTimeout(() => router.replace('/auth/reset-password'), 150);
        }
      }
    });

    // Case 2: app already open — link foregrounds it
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url, true);
    });

    return () => sub.remove();
  }, [setRecovery]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/sign-in" />
        <Stack.Screen name="auth/sign-up" />
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="auth/reset-password" />
        <Stack.Screen name="role-select" />
        <Stack.Screen name="plan-select" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="assessment" />
        <Stack.Screen name="results" />
        <Stack.Screen name="dashboard/parent" />
        <Stack.Screen name="dashboard/clinician" />
        <Stack.Screen name="dashboard/slt" />
        <Stack.Screen name="dashboard/admin" />
        <Stack.Screen name="nutrition" />
        <Stack.Screen name="journey" />
        <Stack.Screen name="community" />
        <Stack.Screen name="notifications-prefs" />
        <Stack.Screen name="privacy-policy" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="book-appointment" />
      </Stack>
      <CookieBanner />
    </>
  );
}

export default function RootLayout() {
  return (
    <RecoveryProvider>
      <RootLayoutInner />
    </RecoveryProvider>
  );
}
