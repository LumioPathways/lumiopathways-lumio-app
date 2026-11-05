/**
 * Lumio Pathways — GDPR Cookie / Consent Banner
 *
 * Shown once on first launch (or after account creation).
 * Persisted in AsyncStorage so it only shows once.
 * Slim bottom sheet design — non-intrusive.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const CONSENT_KEY = '@lumio_consent_v1';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(120))[0];

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY).then((val) => {
      if (!val) {
        setVisible(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }).start();
      }
    });
  }, []);

  const accept = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    dismiss();
  };

  const decline = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }));
    dismiss();
  };

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 200,
      duration: 250,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.inner}>
        <View style={styles.textBlock}>
          <Text style={styles.heading}>🍪 We use cookies</Text>
          <Text style={styles.body}>
            We use functional cookies to keep you signed in, and optional analytics to improve the app.
            {' '}
            <Text style={styles.link} onPress={() => router.push('/privacy-policy')}>
              Privacy policy
            </Text>
          </Text>
        </View>
        <View style={styles.btns}>
          <TouchableOpacity style={styles.declineBtn} onPress={decline}>
            <Text style={styles.declineText}>Essential only</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={accept}>
            <Text style={styles.acceptText}>Accept all</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 36,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  inner: { gap: 14 },
  textBlock: {},
  heading: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 6 },
  body: { fontSize: 13, color: '#D1D5DB', lineHeight: 20 },
  link: { color: '#FCD34D', fontWeight: '600', textDecorationLine: 'underline' },
  btns: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', backgroundColor: '#374151',
    borderWidth: 1, borderColor: '#4B5563',
  },
  declineText: { fontSize: 14, fontWeight: '600', color: '#D1D5DB' },
  acceptBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', backgroundColor: '#F5A623',
  },
  acceptText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
