import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import {
  applyCalendarSuggestions,
  applyFullGoalPlan,
  applyHabitSuggestions,
  applyTodoSuggestions,
  loadCalendarEventsBestEffort,
  loadHabitsState,
  loadTodoStateBestEffort,
} from './adapters';
import { PSYCHE_THEME, GOLD } from './styles';
import {
  loadPsycheHistory,
  loadPsycheSettings,
  savePsycheHistory,
  savePsycheSettings,
  loadPsycheGoals,
  savePsycheGoals,
} from './storage';

import { computeSignals } from './engine/computeSignals';
import { buildProfile } from './engine/buildProfile';
import { generateReflection } from './engine/generateReflection';
import { buildGoalPlan, createGoal } from './engine/goalPlanner';
import {
  GoalHorizon,
  MotivationStyleId,
  PsycheDailySnapshot,
  PsycheGoal,
  PsycheGoalPlan,
  PsycheSettings,
  TodoLikeTask,
  CalendarEventLike,
} from './types';

dayjs.locale('de');

const DEFAULT_SETTINGS: PsycheSettings = { style: 'winner', intensity: 2 };

const STYLE_LABEL: Record<MotivationStyleId, string> = {
  winner: 'Winner',
  coach: 'Coach',
  stoic: 'Stoic',
  friend: 'Friend',
};

const HORIZON_LABEL: Record<GoalHorizon, string> = {
  week: '1 Woche',
  month: '1 Monat',
  year: '1 Jahr',
  fiveYears: '5 Jahre',
};

function formatHour(iso: string) {
  return dayjs(iso).format('ddd HH:mm');
}

export default function PsycheScreen() {
  const [settings, setSettings] = useState<PsycheSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [history, setHistory] = useState<PsycheDailySnapshot[]>([]);
  const [goals, setGoals] = useState<PsycheGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const [goalTitle, setGoalTitle] = useState('');
  const [goalHorizon, setGoalHorizon] = useState<GoalHorizon>('month');

  const [todoTasks, setTodoTasks] = useState<TodoLikeTask[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventLike[]>([]);

  const todayKey = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const latest = useMemo(() => history[history.length - 1] ?? null, [history]);
  const activeGoal = useMemo(() => goals.find((g) => g.active) ?? null, [goals]);

  const reflection = useMemo(() => {
    if (!latest) return null;
    return generateReflection({
      style: settings.style,
      intensity: settings.intensity,
      profile: latest.profile,
      signals: latest.signals,
    });
  }, [latest, settings]);

  const currentPlan: PsycheGoalPlan | null = useMemo(() => {
    if (!activeGoal) return null;

    const dayStart = dayjs().hour(7).minute(0).second(0).millisecond(0).toDate();
    const dayEnd = dayjs().hour(22).minute(0).second(0).millisecond(0).toDate();

    return buildGoalPlan({
      goal: activeGoal,
      tasks: todoTasks,
      calendarEvents,
      dayStart,
      dayEnd,
    });
  }, [activeGoal, todoTasks, calendarEvents]);

  async function reloadExternalData() {
    const todo = await loadTodoStateBestEffort();
    const cal = await loadCalendarEventsBestEffort();
    
    setTodoTasks(todo?.tasks ?? []);
    setCalendarEvents(Array.isArray(cal) ? cal : []);
  }

  async function refreshSnapshot() {
    const habits = await loadHabitsState();
    const todo = await loadTodoStateBestEffort();
    const cal = await loadCalendarEventsBestEffort();
    const histSignals = history.map((h) => h.signals);

    const signals = computeSignals({
      habits,
      todo,
      calendarEvents: cal,
      historySignals: histSignals,
    });

    const profile = buildProfile(signals);
    const snap: PsycheDailySnapshot = {
      dateKey: dayjs().format('YYYY-MM-DD'),
      signals,
      profile,
    };

    const next = [...history];
    const idx = next.findIndex((x) => x.dateKey === snap.dateKey);
    if (idx >= 0) next[idx] = snap;
    else next.push(snap);

    const trimmed = next.slice(Math.max(0, next.length - 30));
    setHistory(trimmed);
    await savePsycheHistory(trimmed);
    await reloadExternalData();
  }

  async function addGoal() {
    const title = goalTitle.trim();
    if (!title) return;

    const newGoal = createGoal({
      title,
      horizon: goalHorizon,
    });

    const next = goals.map((g) => ({ ...g, active: false })).concat(newGoal);
    setGoals(next);
    await savePsycheGoals(next);
    setGoalTitle('');
    await reloadExternalData();
  }

  async function setActiveGoal(goalId: string) {
    const next = goals.map((g) => ({
      ...g,
      active: g.id === goalId,
    }));
    setGoals(next);
    await savePsycheGoals(next);
  }

  async function applyTodosFromPlan() {
    if (!currentPlan) return;

    const result = await applyTodoSuggestions(currentPlan.todos);
    await reloadExternalData();
    await refreshSnapshot();
    Alert.alert('Todos übernommen', `${result.added} Vorschläge wurden hinzugefügt.`);
  }

  async function applyHabitsFromPlan() {
    if (!currentPlan) return;

    const result = await applyHabitSuggestions(currentPlan.habits);
    await reloadExternalData();
    await refreshSnapshot();
    Alert.alert('Habits übernommen', `${result.added} Vorschläge wurden hinzugefügt.`);
  }

  async function applyCalendarFromPlan() {
    if (!currentPlan) return;

    const result = await applyCalendarSuggestions(currentPlan.calendarBlocks);
    await reloadExternalData();
    await refreshSnapshot();
    Alert.alert('Kalender aktualisiert', `${result.added} Block-Vorschläge wurden eingeplant.`);
  }

  async function applyAllFromPlan() {
    if (!currentPlan) return;

    const result = await applyFullGoalPlan({
      todos: currentPlan.todos,
      habits: currentPlan.habits,
      calendarBlocks: currentPlan.calendarBlocks,
    });
    
    await reloadExternalData();
    await refreshSnapshot();
    Alert.alert(
      'Plan angewendet',
      `Todos: ${result.todosAdded}\nHabits: ${result.habitsAdded}\nKalender: ${result.calendarAdded}`
    );
  }

  useEffect(() => {
    (async () => {
      const [s, h, g] = await Promise.all([
        loadPsycheSettings(),
        loadPsycheHistory(),
        loadPsycheGoals(),
      ]);

      if (s) setSettings(s);
      setHistory(h);
      setGoals(g);
      await reloadExternalData();
      setLoading(false);

      const hasToday = h.some((x) => x.dateKey === todayKey);
      if (!hasToday) {
        const habits = await loadHabitsState();
        const todo = await loadTodoStateBestEffort();
        const cal = await loadCalendarEventsBestEffort();
        const histSignals = h.map((x) => x.signals);

        const signals = computeSignals({
          habits,
          todo,
          calendarEvents: cal,
          historySignals: histSignals,
        });

        const profile = buildProfile(signals);
        const snap: PsycheDailySnapshot = {
          dateKey: todayKey,
          signals,
          profile,
        };

        const next = [...h, snap].slice(Math.max(0, h.length + 1 - 30));
        setHistory(next);
        await savePsycheHistory(next);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    savePsycheSettings(settings);
  }, [settings]);

  return (
    <>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Psyche</Text>
          <Text style={styles.sub}>
            AI Reflection · {STYLE_LABEL[settings.style]} · Intensität {settings.intensity}
          </Text>
        </View>

        <Pressable onPress={() => setSettingsOpen(true)} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>⚙︎</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: PSYCHE_THEME.bgDark }}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      >
        {loading || !latest ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Lade…</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tagesimpuls</Text>
              {reflection && (
                <>
                  <Text style={styles.body}>{reflection.title}</Text>
                  <Text style={styles.body}>{reflection.body}</Text>

                  <Text style={[styles.microTitle, { marginTop: 14 }]}>NÄCHSTER SCHRITT</Text>
                  <Text style={styles.micro}>{reflection.microAction}</Text>

                  <View style={styles.tagRow}>
                    {reflection.tags.slice(0, 4).map((t) => (
                      <View key={t} style={styles.tag}>
                        <Text style={styles.tagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ziele</Text>

              <TextInput
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder="z. B. Mondscheinsonate spielen können"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={styles.input}
              />

              <View style={styles.horizonRow}>
                {(['week', 'month', 'year', 'fiveYears'] as GoalHorizon[]).map((h) => {
                  const active = goalHorizon === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => setGoalHorizon(h)}
                      style={[
                        styles.pill,
                        active && { borderColor: GOLD, backgroundColor: 'rgba(212,175,55,0.12)' },
                      ]}
                    >
                      <Text style={styles.pillText}>{HORIZON_LABEL[h]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable onPress={addGoal} style={[styles.primaryBtn, { backgroundColor: GOLD, marginTop: 14 }]}>
                <Text style={styles.primaryText}>Ziel hinzufügen</Text>
              </Pressable>

              <View style={{ gap: 10, marginTop: 14 }}>
                {goals.map((goal) => {
                  const isActive = goal.active;
                  return (
                    <Pressable
                      key={goal.id}
                      onPress={() => setActiveGoal(goal.id)}
                      style={[
                        styles.goalCard,
                        isActive && { borderColor: GOLD, backgroundColor: 'rgba(212,175,55,0.08)' },
                      ]}
                    >
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      <Text style={styles.goalMeta}>
                        {HORIZON_LABEL[goal.horizon]} · {goal.category} · {goal.difficulty}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {currentPlan && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>AI Goal Plan</Text>
                <Text style={styles.body}>{currentPlan.motivation}</Text>
                <Text style={[styles.hint, { marginTop: 8 }]}>{currentPlan.summary}</Text>

                {currentPlan.todos.length > 0 && (
                  <View style={{ marginTop: 16, gap: 10 }}>
                    <Text style={styles.microTitle}>TODO VORSCHLÄGE</Text>
                    {currentPlan.todos.map((item) => (
                      <View key={item.id} style={styles.suggestionCard}>
                        <Text style={styles.suggestionTitle}>{item.title}</Text>
                        <Text style={styles.suggestionReason}>
                          {item.priority.toUpperCase()} · {item.reason}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {currentPlan.habits.length > 0 && (
                  <View style={{ marginTop: 16, gap: 10 }}>
                    <Text style={styles.microTitle}>HABIT VORSCHLÄGE</Text>
                    {currentPlan.habits.map((item) => (
                      <View key={item.id} style={styles.suggestionCard}>
                        <Text style={styles.suggestionTitle}>{item.title}</Text>
                        <Text style={styles.suggestionReason}>
                          {item.frequencyPerDay}x täglich · {item.reason}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {currentPlan.calendarBlocks.length > 0 && (
                  <View style={{ marginTop: 16, gap: 10 }}>
                    <Text style={styles.microTitle}>KALENDER VORSCHLÄGE</Text>
                    {currentPlan.calendarBlocks.map((item) => (
                      <View key={item.id} style={styles.suggestionCard}>
                        <Text style={styles.suggestionTitle}>{item.title}</Text>
                        <Text style={styles.suggestionReason}>
                          {formatHour(item.start)} – {dayjs(item.end).format('HH:mm')}
                        </Text>
                        <Text style={styles.suggestionReason}>{item.reason}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ marginTop: 18, gap: 10 }}>
                  <Pressable
                    onPress={applyAllFromPlan}
                    style={[styles.primaryBtn, { backgroundColor: GOLD }]}
                  >
                    <Text style={styles.primaryText}>Alles übernehmen</Text>
                  </Pressable>

                  <View style={styles.applyGrid}>
                    <Pressable onPress={applyTodosFromPlan} style={styles.applyBtn}>
                      <Text style={styles.applyBtnText}>Als Todo</Text>
                    </Pressable>

                    <Pressable onPress={applyHabitsFromPlan} style={styles.applyBtn}>
                      <Text style={styles.applyBtnText}>Als Habit</Text>
                    </Pressable>

                    <Pressable onPress={applyCalendarFromPlan} style={styles.applyBtn}>
                      <Text style={styles.applyBtnText}>In Kalender</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mindset Profil</Text>
              <View style={{ marginTop: 12, gap: 8 }}>
                <StatRow label="Disziplin" value={latest.profile.discipline} />
                <StatRow label="Konstanz" value={latest.profile.consistency} />
                <StatRow label="Fokus" value={latest.profile.focus} />
                <StatRow label="Planung" value={latest.profile.planning} />
                <StatRow label="Recovery" value={latest.profile.recovery} />
                <StatRow label="Momentum" value={latest.profile.momentum} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable onPress={refreshSnapshot} style={[styles.primaryBtn, { backgroundColor: GOLD }]}>
                  <Text style={styles.primaryText}>Neu analysieren</Text>
                </Pressable>
                <Pressable onPress={() => setSettingsOpen(true)} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>Stil ändern</Text>
                </Pressable>
              </View>

              <Text style={styles.hint}>
                Habits werden sicher geladen. To-Do/Kalender werden aktuell best effort geladen.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={settingsOpen} animationType="fade" transparent onRequestClose={() => setSettingsOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setSettingsOpen(false)}>
          <Pressable style={styles.modal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Motivation einstellen</Text>

            <Text style={styles.modalLabel}>STIL</Text>
            <View style={styles.horizonRow}>
              {(['winner', 'coach', 'stoic', 'friend'] as MotivationStyleId[]).map((id) => {
                const active = settings.style === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setSettings((s) => ({ ...s, style: id }))}
                    style={[
                      styles.pill,
                      active && { borderColor: GOLD, backgroundColor: 'rgba(212,175,55,0.12)' },
                    ]}
                  >
                    <Text style={styles.pillText}>{STYLE_LABEL[id]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.modalLabel}>INTENSITÄT</Text>
            <View style={styles.horizonRow}>
              {[1, 2, 3].map((n) => {
                const active = settings.intensity === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setSettings((s) => ({ ...s, intensity: n as 1 | 2 | 3 }))}
                    style={[
                      styles.pill,
                      active && { borderColor: GOLD, backgroundColor: 'rgba(212,175,55,0.12)' },
                    ]}
                  >
                    <Text style={styles.pillText}>{n === 1 ? 'Soft' : n === 2 ? 'Normal' : 'Hard'}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setSettingsOpen(false)}
              style={[styles.primaryBtn, { backgroundColor: GOLD, marginTop: 16 }]}
            >
              <Text style={styles.primaryText}>Fertig</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: PSYCHE_THEME.bgDark,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  h1: {
    color: PSYCHE_THEME.text,
    fontSize: 28,
    fontWeight: '900',
  },
  sub: {
    marginTop: 6,
    color: PSYCHE_THEME.muted,
    fontWeight: '900',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '900',
    fontSize: 16,
    marginTop: -1,
  },
  card: {
    backgroundColor: PSYCHE_THEME.cardDark,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  cardTitle: {
    color: PSYCHE_THEME.text,
    fontWeight: '900',
    fontSize: 16,
  },
  body: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '800',
    lineHeight: 20,
  },
  microTitle: {
    color: PSYCHE_THEME.muted,
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 12,
  },
  micro: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '900',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  tagText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '900',
    fontSize: 12,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#0B1636',
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  secondaryText: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '900',
  },
  hint: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 18,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#0F2454',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  modalTitle: {
    color: PSYCHE_THEME.text,
    fontWeight: '900',
    fontSize: 16,
  },
  modalLabel: {
    marginTop: 12,
    color: PSYCHE_THEME.muted,
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillText: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '900',
  },
  horizonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  input: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.05)',
    fontWeight: '700',
  },
  goalCard: {
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  goalTitle: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
  },
  goalMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.62)',
    fontWeight: '800',
    fontSize: 12,
  },
  suggestionCard: {
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  suggestionTitle: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
  },
  suggestionReason: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 18,
  },
  applyGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  applyBtn: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: PSYCHE_THEME.border,
  },
  applyBtnText: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '900',
    fontSize: 13,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '800',
  },
  statValue: {
    color: 'white',
    fontWeight: '900',
  },
});