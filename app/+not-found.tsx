/**
 * Lumio Pathways — Unmatched Route handler
 */
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function NotFound() {
  const params = useLocalSearchParams();

  useEffect(() => {
    const accessToken = params['access_token'] as string | undefined;
    const type = params['type'] as string | undefined;

    if (accessToken && type === 'recovery') {
      router.replace({
        pathname: '/auth/reset-password',
        params: { access_token: accessToken },
      });
    } else {
      router.replace('/auth/sign-in');
    }
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#F5A623" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D2137' },
});
