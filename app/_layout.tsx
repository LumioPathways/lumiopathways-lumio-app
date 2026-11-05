import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Linking } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { router } from 'expo-router';
import { auth } from '../lib/supabase';
import CookieBanner from '../components/CookieBanner';

enableScreens(false);

function parseFragment(url: string): Record<string, string> {
  // Handle both hash (#) and query (?) fragments — Supabase uses hash
  const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
  const result: Record<string, string> = {};
  (fragment ?? '').split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) result[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
  });
  return result;
}

async function handleDeepLink(url: string): Promise<boolean> {
  const params = parseFragment(url);
  if (params.type === 'recovery' && params.access_token) {
    // Restore session so the reset screen can call PUT /auth/v1/user
    await auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    router.replace({
      pathname: '/auth/reset-password',
      params: { access_token: params.access_token },
    });
    return true;
  }
  return false;
}

export default function RootLayout() {
  useEffect(() => {
    // Case 1: app was closed — tap link opens it cold
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    });

    // Case 2: app is already open — tap link foregrounds it
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => sub.remove();
  }, []);

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
