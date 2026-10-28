import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { auth } from '../lib/supabase';

export default function Index() {
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const { data } = auth.getSession();
        if (data.session) {
          router.replace('/onboarding');
        } else {
          router.replace('/auth/sign-in');
        }
      } catch (e) {
        // If navigation fails, try again after another delay
        setTimeout(() => {
          router.replace('/auth/sign-in');
        }, 500);
      }
    }, 500);
    return () => clearTimeout(timer);
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
