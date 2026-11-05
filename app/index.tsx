/**
 * Lumio Pathways — Entry / Splash redirect
 *
 * Deep link handling (password reset) is in _layout.tsx.
 * This screen only handles session-based routing.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { auth, from } from '../lib/supabase';
import { pendingRecovery } from './_layout'; // boolean flag only

export default function Index() {
  useEffect(() => {
    // Guard: if this component unmounts before async work finishes,
    // do not fire any navigation — another screen has already taken over.
    let active = true;

    (async () => {
      if (pendingRecovery) return;

      const { data: sessionData } = await auth.getSession();
      if (!active) return; // navigated away already

      if (!sessionData?.session) {
        router.replace('/auth/sign-in');
        return;
      }

      const userId = sessionData.session.user.id;
      const { data: staffRows } = await from('staff_roles')
        .select('role')
        .eq('user_id', userId);

      if (!active) return; // navigated away already

      if (Array.isArray(staffRows) && staffRows.length > 0) {
        const roles = (staffRows as any[]).map((r: any) => r.role);
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

      router.replace('/onboarding');
    })();

    return () => { active = false; };
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
