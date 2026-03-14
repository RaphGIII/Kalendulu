import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import { useHabits } from './useHabits';
import type { HabitCadence } from './types';

dayjs.locale('de');

const BG = '#2E437A';
const BG_DARK = '#233A73';
const CARD = '#314A86';
const CARD_DARK = '#162E63';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';
const BORDER = 'rgba(255,255,255,0.10)';
const GOLD = '#D4AF37';

function cadenceLabel(cadence?: HabitCadence) {
  switch (cadence) {
    case 'selected_days':
      return 'Bestimmte Tage';
    case 'weekly':
      return 'Wöchentlich';
    case 'monthly':
      return 'Monatlich';
    default:
      return 'Täglich';
  }
}

export default function HabitsScreen() {
  const {
    state,
    todayKey,
    hydrated,
    streaksByHabitId,
    toggleCheckin,
    addHabit,
    removeHabit,
  } = useHabits();

  const [addOpen, setAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [celebratingHabitId, setCelebratingHabitId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [color, setColor] = useState('#D4AF37');
  const [cadence, setCadence] = useState<HabitCadence>('daily');
  const [targetPerDay, setTargetPerDay] = useState('1');
  const [targetCount, setTargetCount] = useState('3');
  const [durationMinutes, setDurationMinutes] = useState('10');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 3, 5]);

  const glow = useRef(new Animated.Value(0.65)).current;
  const rewardScale = useRef(new Animated.Value(0)).current;
  const rewardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.65,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [glow]);

  const accent = useMemo(() => state.habits[0]?.color ?? GOLD, [state.habits]);

  const totalToday = useMemo(() => {
    return state.habits.reduce((acc, habit) => acc + (habit.checkins[todayKey] ?? 0), 0);
  }, [state.habits, todayKey]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => dayjs().subtract(6 - index, 'day')),
    [],
  );

  function toggleWeekday(day: number) {
    setSelectedWeekdays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setSubcategory('');
    setColor('#D4AF37');
    setCadence('daily');
    setTargetPerDay('1');
    setTargetCount('3');
    setDurationMinutes('10');
    setDayOfMonth('1');
    setSelectedWeekdays([1, 3, 5]);
  }

  function triggerReward(habitId: string) {
    setCelebratingHabitId(habitId);
    rewardScale.setValue(0.4);
    rewardOpacity.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(rewardOpacity, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.delay(350),
        Animated.timing(rewardOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.spring(rewardScale, {
          toValue: 1.12,
          useNativeDriver: true,
          friction: 5,
          tension: 120,
        }),
        Animated.spring(rewardScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 110,
        }),
      ]),
    ]).start(() => {
      setCelebratingHabitId(null);
    });
  }

  function handleHabitCheckin(habitId: string) {
    toggleCheckin(habitId, todayKey);
    triggerReward(habitId);
  }

  function submitHabit() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    addHabit({
      title: trimmedTitle,
      color,
      description,
      subcategory,
      cadence,
      targetPerDay: Math.max(1, Number(targetPerDay) || 1),
      targetCount: Math.max(1, Number(targetCount) || 1),
      weekdays: selectedWeekdays.length ? selectedWeekdays : [1, 3, 5],
      dayOfMonth: cadence === 'monthly' ? Math.max(1, Math.min(28, Number(dayOfMonth) || 1)) : null,
      durationMinutes: Math.max(1, Number(durationMinutes) || 10),
    });

    resetForm();
    setAddOpen(false);
  }

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loaderWrap}>
          <Text style={styles.loaderText}>Lade Habits…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Habits</Text>
          <Text style={styles.todayStat}>Heute: {totalToday} Check-ins</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Diese Woche</Text>
          <View style={styles.weekRow}>
            {weekDays.map((day) => {
              const key = day.format('YYYY-MM-DD');
              const isToday = key === todayKey;
              const doneAny = state.habits.some((habit) => (habit.checkins[key] ?? 0) > 0);

              return (
                <View
                  key={key}
                  style={[
                    styles.dayPill,
                    isToday && { borderColor: GOLD, borderWidth: 2 },
                  ]}
                >
                  <Text style={styles.dayDow}>{day.format('dd').toUpperCase()}</Text>
                  <View
                    style={[
                      styles.dayDot,
                      { backgroundColor: doneAny ? GOLD : 'rgba(255,255,255,0.14)' },
                    ]}
                  />
                  <Text style={styles.dayNum}>{day.format('D')}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Deine Habits</Text>

          {state.habits.length === 0 ? (
            <Text style={styles.emptyText}>Noch keine Habits vorhanden.</Text>
          ) : (
            state.habits.map((habit) => {
              const done = habit.checkins[todayKey] ?? 0;
              const streak = streaksByHabitId[habit.id]?.current ?? 0;
              const best = streaksByHabitId[habit.id]?.best ?? 0;
              const expanded = expandedId === habit.id;
              const targetLabel =
                habit.cadence === 'weekly' || habit.cadence === 'monthly'
                  ? `${habit.targetCount ?? 1}x`
                  : `${habit.targetPerDay}x`;

              const isCelebrating = celebratingHabitId === habit.id;

              return (
                <View key={habit.id} style={styles.habitRow}>
                  <Pressable onPress={() => handleHabitCheckin(habit.id)} style={styles.habitMain}>
                    <View style={[styles.habitAccent, { backgroundColor: habit.color }]} />

                    <View style={styles.habitTextWrap}>
                      <Text style={styles.habitTitle}>{habit.title}</Text>
                      <Text style={styles.habitMeta}>
                        {cadenceLabel(habit.cadence)} · Ziel: {targetLabel} · Streak: {streak} · Best: {best}
                      </Text>

                      {habit.subcategory ? (
                        <Text style={styles.habitSubMeta}>Kategorie: {habit.subcategory}</Text>
                      ) : null}
                    </View>

                    <Animated.View
                      style={[
                        styles.progressPill,
                        done >= (habit.targetPerDay || 1) && {
                          backgroundColor: 'rgba(255,255,255,0.14)',
                        },
                        isCelebrating && {
                          transform: [{ scale: rewardScale }],
                        },
                      ]}
                    >
                      <Text style={styles.progressText}>
                        {done}/{habit.targetPerDay || 1}
                      </Text>
                    </Animated.View>
                  </Pressable>

                  {isCelebrating ? (
                    <Animated.View
                      style={[
                        styles.rewardBadge,
                        {
                          opacity: rewardOpacity,
                          transform: [{ scale: rewardScale }],
                        },
                      ]}
                    >
                      <Text style={styles.rewardBadgeText}>Stark 🔥</Text>
                    </Animated.View>
                  ) : null}

                  <View style={styles.sideActions}>
                    <Pressable
                      onPress={() =>
                        setExpandedId((current) => (current === habit.id ? null : habit.id))
                      }
                      style={styles.iconBtn}
                    >
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={TEXT}
                      />
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          'Habit löschen',
                          'Möchtest du dieses Habit wirklich löschen?',
                          [
                            { text: 'Abbrechen', style: 'cancel' },
                            {
                              text: 'Löschen',
                              style: 'destructive',
                              onPress: () => removeHabit(habit.id),
                            },
                          ],
                        );
                      }}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ffb4b4" />
                    </Pressable>
                  </View>

                  {expanded ? (
                    <View style={styles.expandedCard}>
                      {habit.description ? (
                        <>
                          <Text style={styles.expandedLabel}>Beschreibung</Text>
                          <Text style={styles.expandedText}>{habit.description}</Text>
                        </>
                      ) : null}

                      <Text style={styles.expandedLabel}>Details</Text>
                      <Text style={styles.expandedText}>
                        Rhythmus: {cadenceLabel(habit.cadence)}
                      </Text>

                      {habit.durationMinutes ? (
                        <Text style={styles.expandedText}>
                          Dauer: {habit.durationMinutes} Minuten
                        </Text>
                      ) : null}

                      {habit.cadence === 'selected_days' && habit.weekdays?.length ? (
                        <Text style={styles.expandedText}>
                          Tage: {habit.weekdays.join(', ')}
                        </Text>
                      ) : null}

                      {habit.cadence === 'monthly' && habit.dayOfMonth ? (
                        <Text style={styles.expandedText}>
                          Tag im Monat: {habit.dayOfMonth}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Animated.View
        style={[
          styles.fabGlow,
          {
            opacity: glow,
            shadowOpacity: glow,
            borderColor: accent,
          },
        ]}
      />
      <Pressable onPress={() => setAddOpen(true)} style={[styles.fab, { backgroundColor: accent }]}>
        <Ionicons name="add" size={28} color="#0B1636" />
      </Pressable>

      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Neues Habit</Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Zum Beispiel: Kurz lernen"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
            />

            <TextInput
              value={subcategory}
              onChangeText={setSubcategory}
              placeholder="Unterkategorie, z. B. Start / Fokus / Review"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.input}
            />

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Kurze Beschreibung"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={[styles.input, styles.textarea]}
              multiline
            />

            <Text style={styles.modalSectionLabel}>Frequenz</Text>
            <View style={styles.pillRow}>
              {(['daily', 'selected_days', 'weekly', 'monthly'] as const).map((item) => {
                const active = cadence === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setCadence(item)}
                    style={[styles.modalPill, active && styles.modalPillActive]}
                  >
                    <Text
                      style={[
                        styles.modalPillText,
                        active && styles.modalPillTextActive,
                      ]}
                    >
                      {cadenceLabel(item)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {(cadence === 'daily' || cadence === 'selected_days') ? (
              <TextInput
                value={targetPerDay}
                onChangeText={setTargetPerDay}
                placeholder="Ziel pro Tag"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="numeric"
                style={styles.input}
              />
            ) : (
              <TextInput
                value={targetCount}
                onChangeText={setTargetCount}
                placeholder="Wie oft pro Woche / Monat?"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="numeric"
                style={styles.input}
              />
            )}

            {cadence === 'selected_days' ? (
              <>
                <Text style={styles.modalSectionLabel}>Wochentage</Text>
                <View style={styles.pillRow}>
                  {[
                    { id: 1, label: 'Mo' },
                    { id: 2, label: 'Di' },
                    { id: 3, label: 'Mi' },
                    { id: 4, label: 'Do' },
                    { id: 5, label: 'Fr' },
                    { id: 6, label: 'Sa' },
                    { id: 0, label: 'So' },
                  ].map((day) => {
                    const active = selectedWeekdays.includes(day.id);
                    return (
                      <Pressable
                        key={day.id}
                        onPress={() => toggleWeekday(day.id)}
                        style={[styles.modalPill, active && styles.modalPillActive]}
                      >
                        <Text
                          style={[
                            styles.modalPillText,
                            active && styles.modalPillTextActive,
                          ]}
                        >
                          {day.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {cadence === 'monthly' ? (
              <TextInput
                value={dayOfMonth}
                onChangeText={setDayOfMonth}
                placeholder="Tag im Monat, z. B. 5"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="numeric"
                style={styles.input}
              />
            ) : null}

            <TextInput
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              placeholder="Dauer in Minuten"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setAddOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Abbrechen</Text>
              </Pressable>

              <Pressable onPress={submitHabit} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Hinzufügen</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingTop: 24,
    paddingHorizontal: 18,
    paddingBottom: 110,
    gap: 16,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: TEXT,
    fontWeight: '900',
  },
  headerTop: {
    backgroundColor: BG_DARK,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: {
    color: TEXT,
    fontSize: 28,
    fontWeight: '900',
  },
  todayStat: {
    marginTop: 10,
    color: GOLD,
    fontWeight: '900',
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: {
    color: TEXT,
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 10,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayPill: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  dayDow: {
    color: MUTED,
    fontWeight: '900',
    fontSize: 11,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    marginTop: 6,
  },
  dayNum: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '900',
  },
  emptyText: {
    color: MUTED,
    fontWeight: '700',
    lineHeight: 20,
  },
  habitRow: {
    backgroundColor: CARD_DARK,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 12,
    position: 'relative',
  },
  habitMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitAccent: {
    width: 10,
    height: 40,
    borderRadius: 6,
  },
  habitTextWrap: {
    flex: 1,
  },
  habitTitle: {
    color: TEXT,
    fontWeight: '900',
    fontSize: 15,
  },
  habitMeta: {
    marginTop: 4,
    color: MUTED,
    fontWeight: '800',
    fontSize: 12,
  },
  habitSubMeta: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.84)',
    fontSize: 12,
    fontWeight: '700',
  },
  progressPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  progressText: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '900',
  },
  rewardBadge: {
    position: 'absolute',
    right: 92,
    top: 16,
    backgroundColor: 'rgba(212,175,55,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rewardBadgeText: {
    color: GOLD,
    fontWeight: '900',
    fontSize: 12,
  },
  sideActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  expandedCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
  },
  expandedLabel: {
    color: GOLD,
    fontWeight: '900',
    marginBottom: 6,
  },
  expandedText: {
    color: TEXT,
    lineHeight: 20,
    marginBottom: 4,
  },
  fabGlow: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 76,
    height: 76,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: GOLD,
    shadowRadius: 18,
    elevation: 16,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 60,
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6,10,22,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: BG_DARK,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  modalTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 12,
  },
  textarea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  modalSectionLabel: {
    color: MUTED,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modalPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalPillActive: {
    backgroundColor: 'rgba(212,175,55,0.16)',
    borderColor: 'rgba(212,175,55,0.28)',
  },
  modalPillText: {
    color: TEXT,
    fontWeight: '800',
    fontSize: 13,
  },
  modalPillTextActive: {
    color: GOLD,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cancelBtnText: {
    color: TEXT,
    fontWeight: '900',
  },
  submitBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: GOLD,
  },
  submitBtnText: {
    color: '#0B1636',
    fontWeight: '900',
  },
});