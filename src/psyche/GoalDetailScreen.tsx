import React from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import type { PsycheGoal } from './types';
import { GOLD, PSYCHE_THEME } from './styles';

dayjs.locale('de');

type Props = {
  goal: PsycheGoal | null;
  onClose?: () => void;
  onApply?: (goal: PsycheGoal) => void;
  onRemove?: (goalId: string) => void;
  onAdjustIntensity?: (goalId: string, delta: 1 | -1) => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function GoalDetailScreen({
  goal,
  onClose,
  onApply,
  onRemove,
  onAdjustIntensity,
}: Props) {
  if (!goal) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Kein Ziel ausgewählt</Text>
          <Text style={styles.emptyText}>Wähle zuerst ein Ziel aus deiner Übersicht aus.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const intensity = goal.executionPlan?.intensityPreset ?? goal.intensityPreset ?? 'balanced';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{goal.title}</Text>
            <Text style={styles.subtitle}>
              {goal.category} · bis {dayjs(goal.targetDate).format('DD.MM.YYYY')}
            </Text>
          </View>

          {onClose ? (
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Schließen</Text>
            </Pressable>
          ) : null}
        </View>

        <Section title="Warum dieses Ziel">
          <Text style={styles.text}>{goal.why || 'Noch kein Warum hinterlegt.'}</Text>
        </Section>

        <Section title="Planlogik">
          <Text style={styles.text}>{goal.recommendation?.summary || 'Noch keine Zusammenfassung vorhanden.'}</Text>
        </Section>

        <Section title="Mini-Ziele">
          {goal.miniSteps?.length ? (
            goal.miniSteps.map((step) => (
              <View key={step.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {step.order}. {step.title}
                </Text>
                <Text style={styles.text}>{step.description}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.text}>Noch keine Mini-Ziele vorhanden.</Text>
          )}
        </Section>

        <Section title="Todos">
          {goal.executionPlan?.todos?.length ? (
            goal.executionPlan.todos.map((todo) => (
              <View key={todo.id} style={styles.card}>
                <Text style={styles.cardTitle}>{todo.shortTitle || todo.title}</Text>
                {todo.shortTitle ? <Text style={styles.cardSub}>{todo.title}</Text> : null}
                <Text style={styles.text}>{todo.reason}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.text}>Noch keine Todos vorhanden.</Text>
          )}
        </Section>

        <Section title="Habits">
          {goal.executionPlan?.habits?.length ? (
            goal.executionPlan.habits.map((habit) => (
              <View key={habit.id} style={styles.card}>
                <Text style={styles.cardTitle}>{habit.shortTitle || habit.title}</Text>
                {habit.shortTitle ? <Text style={styles.cardSub}>{habit.title}</Text> : null}
                <Text style={styles.text}>{habit.reason}</Text>
                <Text style={styles.metaText}>
                  {habit.frequencyPerWeek}x/Woche · {habit.durationMinutes} Min
                </Text>
                {habit.details ? <Text style={[styles.text, { marginTop: 8 }]}>{habit.details}</Text> : null}
              </View>
            ))
          ) : (
            <Text style={styles.text}>Noch keine Habits vorhanden.</Text>
          )}
        </Section>

        <Section title="Kalenderblöcke">
          {goal.executionPlan?.calendarBlocks?.length ? (
            goal.executionPlan.calendarBlocks.map((block) => (
              <View key={block.id} style={styles.card}>
                <Text style={styles.cardTitle}>{block.shortTitle || block.title}</Text>
                <Text style={styles.metaText}>
                  {block.dayLabel} · {block.startTime} · {block.durationMinutes} Min
                </Text>
                <Text style={[styles.text, { marginTop: 8 }]}>{block.reason}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.text}>Noch keine Kalenderblöcke vorhanden.</Text>
          )}
        </Section>

        <Section title="Intensität">
          <View style={styles.intensityRow}>
            <Pressable onPress={() => onAdjustIntensity?.(goal.id, -1)} style={styles.intensityBtn}>
              <Text style={styles.intensityBtnText}>−</Text>
            </Pressable>

            <View style={styles.intensityBadge}>
              <Text style={styles.intensityBadgeText}>{intensity}</Text>
            </View>

            <Pressable onPress={() => onAdjustIntensity?.(goal.id, 1)} style={styles.intensityBtn}>
              <Text style={styles.intensityBtnText}>+</Text>
            </Pressable>
          </View>
        </Section>

        <View style={styles.actions}>
          <Pressable style={styles.applyBtn} onPress={() => onApply?.(goal)}>
            <Text style={styles.applyBtnText}>Plan in App übernehmen</Text>
          </Pressable>

          <Pressable
            style={styles.deleteBtn}
            onPress={() => {
              Alert.alert(
                'Ziel löschen',
                'Möchtest du dieses Ziel wirklich löschen?',
                [
                  { text: 'Abbrechen', style: 'cancel' },
                  {
                    text: 'Löschen',
                    style: 'destructive',
                    onPress: () => onRemove?.(goal.id),
                  },
                ],
              );
            }}
          >
            <Text style={styles.deleteBtnText}>Ziel löschen</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PSYCHE_THEME.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    fontSize: 14,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  closeText: {
    color: '#fff',
    fontWeight: '700',
  },
  section: {
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    color: GOLD,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  cardSub: {
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
    fontSize: 12,
  },
  metaText: {
    color: GOLD,
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intensityBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  intensityBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  intensityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.24)',
  },
  intensityBadgeText: {
    color: GOLD,
    fontWeight: '800',
    fontSize: 14,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  applyBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#161616',
    fontWeight: '800',
    fontSize: 15,
  },
  deleteBtn: {
    backgroundColor: 'rgba(255,90,90,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,90,90,0.22)',
  },
  deleteBtnText: {
    color: '#ff8d8d',
    fontWeight: '800',
    fontSize: 15,
  },
});