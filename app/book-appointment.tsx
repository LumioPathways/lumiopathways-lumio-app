/**
 * Lumio Pathways — Book an Appointment
 *
 * Shown after a subscribed parent views their child's results.
 * Lists available slots from Dr Iyang and Dr Dominic.
 * Parent picks a slot, confirms, and receives an email confirmation.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Modal, TextInput,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { from, getUserId, getUserEmail } from '../lib/supabase';

interface Slot {
  id: string;
  clinician_name: string;
  slot_date: string;
  slot_time: string;
  duration_mins: number;
  appointment_type: 'phone' | 'in_person';
  location?: string;
  is_booked: boolean;
}

const NAVY = '#0D2137';
const TEAL = '#1B4D4A';
const AMBER = '#F5A623';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${hour12}:${m} ${ampm}`;
}

// Group slots by date
function groupByDate(slots: Slot[]) {
  const groups: Record<string, Slot[]> = {};
  slots.forEach(s => {
    if (!groups[s.slot_date]) groups[s.slot_date] = [];
    groups[s.slot_date].push(s);
  });
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function BookAppointment() {
  const { childName = '', childId = '', scores = '' } = useLocalSearchParams<{
    childName: string;
    childId: string;
    scores: string;
  }>();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookedSlot, setBookedSlot] = useState<Slot | null>(null);

  const parentId    = getUserId();
  const parentEmail = getUserEmail() ?? '';

  const loadSlots = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await from('availability_slots')
      .select('*')
      .eq('is_booked', false)
      .gte('slot_date', today)
      .order('slot_date')
      .order('slot_time');
    setSlots(Array.isArray(data) ? data as Slot[] : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !parentId) return;
    setConfirming(true);

    // 1. Create the appointment record
    const { error } = await from('appointments').insert({
      slot_id:      selectedSlot.id,
      parent_id:    parentId,
      parent_email: parentEmail,
      child_id:     childId || null,
      child_name:   childName || null,
      notes:        notes.trim() || null,
      status:       'confirmed',
    });

    if (error) {
      setConfirming(false);
      Alert.alert('Booking failed', 'This slot may have just been taken. Please choose another.');
      loadSlots();
      setSelectedSlot(null);
      return;
    }

    // 2. Mark the slot as booked
    await from('availability_slots').update({ is_booked: true }).eq('id', selectedSlot.id);

    // 3. Send confirmation email via mailto
    const typeLabel = selectedSlot.appointment_type === 'phone' ? 'Phone call' : 'In-person';
    const locationLine = selectedSlot.appointment_type === 'in_person' && selectedSlot.location
      ? `\nLocation: ${selectedSlot.location}` : '';
    const subject = encodeURIComponent(`Lumio appointment confirmed — ${childName || 'your child'}`);
    const body = encodeURIComponent(
      `Hi,\n\nYour Lumio appointment has been confirmed.\n\n` +
      `Doctor: ${selectedSlot.clinician_name}\n` +
      `Date: ${formatDate(selectedSlot.slot_date)}\n` +
      `Time: ${formatTime(selectedSlot.slot_time)}\n` +
      `Type: ${typeLabel}${locationLine}\n` +
      `Duration: ${selectedSlot.duration_mins} minutes\n` +
      (childName ? `\nChild: ${childName}\n` : '') +
      (notes.trim() ? `\nNotes: ${notes.trim()}\n` : '') +
      `\nA member of the Lumio clinical team will be in touch to confirm any further details.\n\n` +
      `If you need to cancel or reschedule, please email hello@lumiopathways.co.uk\n\n` +
      `Lumio Pathways\nhello@lumiopathways.co.uk`
    );

    Linking.openURL(`mailto:${parentEmail}?subject=${subject}&body=${body}`).catch(() => {});
    // Also notify the Lumio team
    const teamSubject = encodeURIComponent(`New booking — ${selectedSlot.clinician_name} — ${childName || parentEmail}`);
    const teamBody = encodeURIComponent(
      `New appointment booked on Lumio Pathways.\n\n` +
      `Doctor: ${selectedSlot.clinician_name}\n` +
      `Date: ${formatDate(selectedSlot.slot_date)} at ${formatTime(selectedSlot.slot_time)}\n` +
      `Type: ${typeLabel}${locationLine}\n` +
      `Parent email: ${parentEmail}\n` +
      (childName ? `Child: ${childName}\n` : '') +
      (notes.trim() ? `Notes: ${notes.trim()}\n` : '')
    );
    setTimeout(() => {
      Linking.openURL(`mailto:hello@lumiopathways.co.uk?subject=${teamSubject}&body=${teamBody}`).catch(() => {});
    }, 1500);

    setConfirming(false);
    setBookedSlot(selectedSlot);
    setBooked(true);
    setSelectedSlot(null);
  };

  // ── Booked confirmation screen ──────────────────────────
  if (booked && bookedSlot) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.wordmark}>Lumio</Text>
          </View>
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>✅</Text>
            <Text style={styles.successTitle}>Appointment booked!</Text>
            <Text style={styles.successSub}>
              A confirmation has been sent to {parentEmail}
            </Text>

            <View style={styles.confirmDetail}>
              <Row label="Doctor"   value={bookedSlot.clinician_name} />
              <Row label="Date"     value={formatDate(bookedSlot.slot_date)} />
              <Row label="Time"     value={formatTime(bookedSlot.slot_time)} />
              <Row label="Type"     value={bookedSlot.appointment_type === 'phone' ? '📞 Phone call' : '🏥 In-person'} />
              {bookedSlot.appointment_type === 'in_person' && bookedSlot.location && (
                <Row label="Location" value={bookedSlot.location} />
              )}
              <Row label="Duration" value={`${bookedSlot.duration_mins} minutes`} />
              {childName ? <Row label="Child" value={childName} /> : null}
            </View>

            <Text style={styles.confirmNote}>
              The Lumio clinical team will be in touch to share the meeting link or further details before your appointment.
            </Text>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => router.replace('/dashboard/parent')}
            >
              <Text style={styles.doneBtnText}>Back to dashboard</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Main booking screen ─────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.wordmark}>Lumio</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.title}>Book a consultation</Text>
        <Text style={styles.subtitle}>
          Discuss {childName ? `${childName}'s` : 'your child's'} profile in depth with one of our consultant paediatricians.
        </Text>

        {/* Doctors panel */}
        <View style={styles.doctorsRow}>
          {[
            { name: 'Dr Iyang', role: 'Consultant Paediatrician', emoji: '👨‍⚕️' },
            { name: 'Dr Dominic', role: 'Consultant Paediatrician', emoji: '👨‍⚕️' },
          ].map(d => (
            <View key={d.name} style={styles.doctorCard}>
              <Text style={styles.doctorEmoji}>{d.emoji}</Text>
              <Text style={styles.doctorName}>{d.name}</Text>
              <Text style={styles.doctorRole}>{d.role}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={AMBER} style={{ marginTop: 40 }} />
        ) : slots.length === 0 ? (
          <View style={styles.noSlotsCard}>
            <Text style={styles.noSlotsEmoji}>📅</Text>
            <Text style={styles.noSlotsTitle}>No slots available yet</Text>
            <Text style={styles.noSlotsText}>
              Our clinical team is adding availability shortly. Email us to be notified as soon as a slot opens.
            </Text>
            <TouchableOpacity
              style={styles.notifyBtn}
              onPress={() => {
                const subject = encodeURIComponent('Lumio — appointment availability notification');
                const body = encodeURIComponent(`Hi,\n\nPlease notify me when a consultation slot becomes available.\n\nParent email: ${parentEmail}\n${childName ? `Child: ${childName}\n` : ''}`);
                Linking.openURL(`mailto:hello@lumiopathways.co.uk?subject=${subject}&body=${body}`).catch(() => {});
              }}
            >
              <Text style={styles.notifyBtnText}>Notify me when slots open</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Available slots</Text>
            {groupByDate(slots).map(([date, daySlots]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateHeading}>{formatDate(date)}</Text>
                {daySlots.map(slot => {
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.slotCard, isSelected && styles.slotCardSelected]}
                      onPress={() => setSelectedSlot(isSelected ? null : slot)}
                    >
                      <View style={styles.slotLeft}>
                        <Text style={[styles.slotTime, isSelected && { color: TEAL }]}>
                          {formatTime(slot.slot_time)}
                        </Text>
                        <Text style={styles.slotDuration}>{slot.duration_mins} min</Text>
                      </View>
                      <View style={styles.slotMid}>
                        <Text style={styles.slotDoctor}>{slot.clinician_name}</Text>
                        <View style={[
                          styles.typeTag,
                          { backgroundColor: slot.appointment_type === 'phone' ? 'rgba(27,77,74,0.15)' : 'rgba(52,211,153,0.12)' }
                        ]}>
                          <Text style={[
                            styles.typeTagText,
                            { color: slot.appointment_type === 'phone' ? '#1D4ED8' : '#15803D' }
                          ]}>
                            {slot.appointment_type === 'phone' ? '📞 Phone' : '🏥 In-person'}
                          </Text>
                        </View>
                        {slot.appointment_type === 'in_person' && slot.location && (
                          <Text style={styles.slotLocation}>{slot.location}</Text>
                        )}
                      </View>
                      <View style={[styles.slotRadio, isSelected && styles.slotRadioSelected]}>
                        {isSelected && <View style={styles.slotRadioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Sticky booking footer */}
      {selectedSlot && (
        <View style={styles.footer}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerDoctor}>{selectedSlot.clinician_name}</Text>
            <Text style={styles.footerTime}>
              {formatDate(selectedSlot.slot_date)} · {formatTime(selectedSlot.slot_time)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.bookBtn, confirming && { opacity: 0.6 }]}
            onPress={() => {
              // Show notes modal before confirming
              Alert.prompt
                ? Alert.prompt(
                    'Any notes for the doctor?',
                    'Optional — anything you want the doctor to know before the appointment.',
                    [
                      { text: 'Skip', onPress: () => handleConfirmBooking() },
                      { text: 'Add note', onPress: (text) => { setNotes(text ?? ''); handleConfirmBooking(); } },
                    ],
                    'plain-text'
                  )
                : handleConfirmBooking();
            }}
            disabled={confirming}
          >
            {confirming
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.bookBtnText}>Confirm booking</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, marginBottom: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 22, color: 'rgba(255,255,255,0.7)' },
  wordmark: { fontSize: 22, fontWeight: '800', color: '#ffffff', letterSpacing: -1 },

  title: { fontSize: 26, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 21, marginBottom: 24 },

  doctorsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  doctorCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 6,
  },
  doctorEmoji: { fontSize: 32 },
  doctorName: { fontSize: 14, fontWeight: '800', color: NAVY },
  doctorRole: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.6)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.6 },

  dateGroup: { marginBottom: 20 },
  dateHeading: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: 10 },

  slotCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  slotCardSelected: { borderColor: TEAL, backgroundColor: '#fff' },
  slotLeft: { alignItems: 'center', width: 56 },
  slotTime: { fontSize: 15, fontWeight: '800', color: NAVY },
  slotDuration: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  slotMid: { flex: 1, gap: 4 },
  slotDoctor: { fontSize: 14, fontWeight: '700', color: NAVY },
  typeTag: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  typeTagText: { fontSize: 12, fontWeight: '700' },
  slotLocation: { fontSize: 12, color: '#9CA3AF' },
  slotRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  slotRadioSelected: { borderColor: TEAL },
  slotRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: TEAL },

  noSlotsCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 28, marginTop: 20 },
  noSlotsEmoji: { fontSize: 40, marginBottom: 12 },
  noSlotsTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  noSlotsText: { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  notifyBtn: { backgroundColor: AMBER, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  notifyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Sticky footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: NAVY, padding: 20, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  footerSummary: { flex: 1 },
  footerDoctor: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  footerTime: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  bookBtn: { backgroundColor: AMBER, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20 },
  bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Success screen
  successCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginTop: 8, alignItems: 'center' },
  successEmoji: { fontSize: 52, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '800', color: NAVY, marginBottom: 8, textAlign: 'center' },
  successSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  confirmDetail: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 20, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  detailLabel: { fontSize: 13, color: '#9CA3AF', flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', color: NAVY, flex: 2, textAlign: 'right' },
  confirmNote: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  doneBtn: { backgroundColor: AMBER, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32 },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
