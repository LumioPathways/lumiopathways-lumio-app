/**
 * Lumio Pathways — Entry / Splash redirect
 *
 * Checks for an existing session and routes the user:
 *   - Authenticated  → /onboarding (start assessment)
 *   - Not signed in  → /auth/sign-in
 */
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { auth } from '../lib/supabase';

export default function Index() {
  useEffect(() => {
    auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/onboarding');
      } else {
        router.replace('/auth/sign-in');
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FBBF24" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBEB' },
});
