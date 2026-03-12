import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import { GOLD, PSYCHE_THEME } from './styles';
import { loadPsycheGoals } from './storage';
import {
  loadCalendarEventsBestEffort,
  loadHabitsState,
  loadTodoStateBestEffort,
} from './adapters';
import { loadGoalLinks } from './goalLinks';
import { enrichGoalsWithProgress } from './engine/goalProgress';
import { computeGoalAdherence } from './engine/goalAdherence';
import { detectGoalStagnation } from './engine/goalStagnation';
import { buildGoalWeeklyReview } from './engine/goalWeeklyReview';
import type { PsycheGoal } from './types';

dayjs.locale('de');

type ReviewItem = {
  goal: PsycheGoal;
  review: ReturnType<typeof buildGoalWeeklyReview>;
  adherence: ReturnType<typeof computeGoalAdherence>;
  stagnation: ReturnType<typeof detectGoalStagnation>;
};

export default function WeeklyReviewScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReviewItem[]>([]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);

      const [storedGoals, habitsState, todoState, calendarEvents, goalLinks] = await Promise.all([
        loadPsycheGoals(),
        loadHabitsState(),
        loadTodoStateBestEffort(),
        loadCalendarEventsBestEffort(),
        loadGoalLinks(),
      ]);

      const enriched = enrichGoalsWithProgress(
        storedGoals.filter((goal) => goal.status === 'active'),
        habitsState?.habits ?? [],
        todoState?.tasks ?? [],
        calendarEvents ?? [],
        goalLinks
      );

      const nextItems = enriched.map((goal) => {
        const adherence = computeGoalAdherence({
          goal,
          habits: habitsState?.habits ?? [],
          tasks: todoState?.tasks ?? [],
          calendarEvents: calendarEvents ?? [],
          goalLinks,
        });

        const stagnation = detectGoalStagnation({ goal, adherence });

        const review = buildGoalWeeklyReview({
          goal,
          adherence,
          stagnation,
        });

        return {
          goal,
          review,
          adherence,
          stagnation,
        };
      });

      setItems(nextItems);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <ActivityIndicator color={GOLD} />
          <Text style={styles.centerText}>Reviews werden geladen ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Weekly Reviews</Text>
          <Text style={styles.heroTitle}>Wöchentliche Zielauswertung</Text>
          <Text style={styles.heroText}>
            Hier siehst du für jedes aktive Ziel, was lief, was bremst und worauf nächste Woche der Fokus liegen sollte.
          </Text>
        </View>

        {items.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Keine aktiven Ziele</Text>
            <Text style={styles.cardText}>Sobald aktive Ziele vorhanden sind, erscheinen hier automatische Reviews.</Text>
          </View>
        ) : null}

        {items.map((item) => (
          <View key={item.goal.id} style={styles.card}>
            <Text style={styles.goalTitle}>{item.goal.title}</Text>
            <Text style={styles.goalMeta}>
              {item.review.weekLabel} · Adherence {item.adherence.overallAdherence}%
            </Text>

            <Text style={styles.summaryText}>{item.review.summary}</Text>

            <Text style={styles.subTitle}>Wins</Text>
            {item.review.wins.length > 0 ? (
              item.review.wins.map((win, index) => (
                <Text key={`${win}-${index}`} style={styles.bulletText}>
                  • {win}
                </Text>
              ))
            ) : (
              <Text style={styles.cardText}>Noch keine klaren Wins erkennbar.</Text>
            )}

            <Text style={styles.subTitle}>Concerns</Text>
            {item.review.concerns.length > 0 ? (
              item.review.concerns.map((concern, index) => (
                <Text key={`${concern}-${index}`} style={styles.bulletText}>
                  • {concern}
                </Text>
              ))
            ) : (
              <Text style={styles.cardText}>Aktuell keine größeren Warnsignale.</Text>
            )}

            <Text style={styles.subTitle}>Nächste Woche Fokus</Text>
            {item.review.nextWeekFocus.map((focus, index) => (
              <Text key={`${focus}-${index}`} style={styles.bulletText}>
                • {focus}
              </Text>
            ))}

            <Text style={styles.subTitle}>Review-Fragen</Text>
            {item.review.reviewQuestions.map((q, index) => (
              <Text key={`${q}-${index}`} style={styles.questionText}>
                {index + 1}. {q}
              </Text>
            ))}

            <View style={styles.divider} />

            <Text style={styles.cardLine}>
              Stagnation: {item.stagnation.isStagnating ? 'Ja' : 'Nein'} · {item.stagnation.severity}
            </Text>
            <Text style={styles.cardLine}>Grund: {item.stagnation.reason}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PSYCHE_THEME.bg },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerText: { color: PSYCHE_THEME.text, fontSize: 15 },
  heroCard: {
    backgroundColor: PSYCHE_THEME.cardDark,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  heroEyebrow: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroTitle: { color: PSYCHE_THEME.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  heroText: { color: PSYCHE_THEME.muted, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: PSYCHE_THEME.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  sectionTitle: { color: PSYCHE_THEME.text, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  goalTitle: { color: PSYCHE_THEME.text, fontSize: 20, fontWeight: '800' },
  goalMeta: { color: GOLD, fontSize: 12, fontWeight: '800', marginTop: 4 },
  summaryText: { color: PSYCHE_THEME.text, fontSize: 14, lineHeight: 21, marginTop: 12 },
  subTitle: { color: GOLD, fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  cardText: { color: PSYCHE_THEME.muted, fontSize: 14, lineHeight: 20 },
  cardLine: { color: PSYCHE_THEME.text, fontSize: 14, lineHeight: 22 },
  bulletText: { color: PSYCHE_THEME.text, fontSize: 14, lineHeight: 21 },
  questionText: { color: PSYCHE_THEME.muted, fontSize: 14, lineHeight: 21 },
  divider: {
    marginTop: 12,
    marginBottom: 10,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});