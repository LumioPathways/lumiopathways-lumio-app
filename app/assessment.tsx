/**
 * Lumio Pathways — Assessment screen
 *
 * Multi-step questionnaire. Questions are defined locally and can be
 * swapped for DB-driven content once the assessment_questions table is
 * populated. Answers are scored and written to child_profiles on completion.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated,
  useWindowDimensions, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getUserId, getUserEmail, from } from '../lib/supabase';

// ── Question bank ─────────────────────────────────────────────────
// Each domain maps to a set of yes/no questions.
// In a future iteration these come from the `need_areas` + assessment tables.
const QUESTIONS = [
  // Sensory & food
  {
    id: 'q1',
    domain: 'sensory',
    text: 'Does your child avoid or strongly dislike certain food textures (e.g. slimy, crunchy, mushy)?',
  },
  {
    id: 'q2',
    domain: 'sensory',
    text: 'Does your child gag or retch at the sight or smell of some foods?',
  },
  {
    id: 'q3',
    domain: 'sensory',
    text: 'Does your child eat fewer than 20 different foods on a regular basis?',
  },
  // Behaviour around food
  {
    id: 'q4',
    domain: 'behaviour',
    text: 'Does your child have meltdowns or extreme distress at mealtimes?',
  },
  {
    id: 'q5',
    domain: 'behaviour',
    text: 'Does your child insist on the same plate, spoon, or mealtime routine every time?',
  },
  // Communication & social
  {
    id: 'q6',
    domain: 'communication',
    text: 'Does your child have difficulty communicating hunger, fullness, or food preferences?',
  },
  {
    id: 'q7',
    domain: 'communication',
    text: 'Does your child struggle to eat socially (school lunch, family meals)?',
  },
  // Nutrition & growth
  {
    id: 'q8',
    domain: 'nutrition',
    text: "Is your child's GP or paediatrician concerned about their weight or growth?",
  },
  {
    id: 'q9',
    domain: 'nutrition',
    text: 'Does your child take nutritional supplements due to a restricted diet?',
  },
  // Sleep & regulation
  {
    id: 'q10',
    domain: 'regulation',
    text: 'Does your child have frequent sleep difficulties that seem linked to eating or sensory issues?',
  },
];

type Answer = 'yes' | 'no' | 'sometimes';

export default function Assessment() {
  const { childName = 'your child', ageBand = '' } = useLocalSearchParams<{
    childName: string;
    ageBand: string;
  }>();

  const [step, setStep] = useState(0); // 0 = current question index
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const { width } = useWindowDimensions();

  const progress = step / QUESTIONS.length;
  const question = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const handleAnswer = async (answer: Answer) => {
    const newAnswers = { ...answers, [question.id]: answer };
    setAnswers(newAnswers);

    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }

    // ── Last question answered: score & save ─────────────────────
    setSaving(true);
    const scores = computeScores(newAnswers);
    await saveProfile({ childName: String(childName), ageBand: String(ageBand), answers: newAnswers, scores });
    setSaving(false);

    router.replace({
      pathname: '/results',
      params: {
        childName,
        ageBand,
        scores: JSON.stringify(scores),
        answers: JSON.stringify(newAnswers),
      },
    });
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Header */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>{step + 1} / {QUESTIONS.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.childName}>{childName}</Text>
        <Text style={styles.domain}>{DOMAIN_LABELS[question.domain]}</Text>
        <Text style={styles.questionText}>{question.text}</Text>

        <View style={styles.answerGroup}>
          {(['yes', 'sometimes', 'no'] as Answer[]).map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.answerBtn, answers[question.id] === a && styles.answerBtnSelected]}
              onPress={() => handleAnswer(a)}
              disabled={saving}
            >
              <Text style={[
                styles.answerText,
                answers[question.id] === a && styles.answerTextSelected,
              ]}>
                {ANSWER_LABELS[a]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {saving && (
          <Text style={styles.savingText}>Saving your answers…</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Domain labels ─────────────────────────────────────────────────
const DOMAIN_LABELS: Record<string, string> = {
  sensory: '🟡 Sensory processing',
  behaviour: '🔵 Behaviour & routine',
  communication: '🟢 Communication',
  nutrition: '🔴 Nutrition & growth',
  regulation: '🟣 Sleep & regulation',
};

const ANSWER_LABELS: Record<Answer, string> = {
  yes: 'Yes, regularly',
  sometimes: 'Sometimes',
  no: 'No / rarely',
};

// ── Scoring ───────────────────────────────────────────────────────
function computeScores(answers: Record<string, Answer>) {
  const domainScores: Record<string, number> = {};
  QUESTIONS.forEach(({ id, domain }) => {
    const a = answers[id];
    const score = a === 'yes' ? 2 : a === 'sometimes' ? 1 : 0;
    domainScores[domain] = (domainScores[domain] ?? 0) + score;
  });
  const domainMax: Record<string, number> = {};
  QUESTIONS.forEach(({ domain }) => { domainMax[domain] = (domainMax[domain] ?? 0) + 2; });
  const pct: Record<string, number> = {};
  for (const d of Object.keys(domainScores)) {
    pct[d] = Math.round((domainScores[d] / (domainMax[d] ?? 1)) * 100);
  }
  return pct;
}

// ── Persist to Supabase ───────────────────────────────────────────
async function saveProfile({
  childName,
  ageBand,
  answers,
  scores,
}: {
  childName: string;
  ageBand: string;
  answers: Record<string, Answer>;
  scores: Record<string, number>;
}) {
  const userId = getUserId();
  const userEmail = getUserEmail();

  if (!userId) return; // not signed in — skip silently (anon assessment)

  const strengths = Object.entries(scores).sort((a, b) => a[1] - b[1])[0]?.[0] ?? '';
  const needs = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  await from('child_profiles').insert({
    owner_id: userId,
    parent_email: userEmail,
    child_name: childName,
    child_age_band: ageBand,
    assessment_answers: answers,
    domain_scores: scores,
    strength_domain: strengths,
    needs_domain: needs,
    assessment_date: new Date().toISOString(),
  });
}

const AMBER = '#F59E0B';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  progressTrack: { height: 4, backgroundColor: '#F3F4F6' },
  progressFill: { height: 4, backgroundColor: AMBER },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: '#374151' },
  stepText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  childName: { fontSize: 15, fontWeight: '700', color: AMBER, marginBottom: 4 },
  domain: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  questionText: { fontSize: 22, fontWeight: '700', color: '#111827', lineHeight: 32, marginBottom: 36 },
  answerGroup: { gap: 14 },
  answerBtn: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 22,
    backgroundColor: '#F9FAFB',
  },
  answerBtnSelected: { backgroundColor: AMBER, borderColor: AMBER },
  answerText: { fontSize: 16, fontWeight: '600', color: '#374151', textAlign: 'center' },
  answerTextSelected: { color: '#fff' },
  savingText: { textAlign: 'center', color: '#9CA3AF', marginTop: 24, fontSize: 14 },
});
