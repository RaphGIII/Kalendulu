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
import { useAppTheme } from '@/src/theme/ThemeProvider';

dayjs.locale('de');

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

function weekdayLabel(day: number) {
  switch (day) {
    case 1:
      return 'Mo';
    case 2:
      return 'Di';
    case 3:
      return 'Mi';
    case 4:
      return 'Do';
    case 5:
      return 'Fr';
    case 6:
      return 'Sa';
    case 0:
      return 'So';
    default:
      return String(day);
  }
}

function getHabitPaletteColor(
  colorIndex: number | undefined,
  habitPalette: string[],
  fallback: string,
) {
  if (!habitPalette.length) return fallback;
  if (typeof colorIndex !== 'number' || colorIndex < 0) return habitPalette[0] ?? fallback;
  return habitPalette[colorIndex % habitPalette.length] ?? fallback;
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

  const { colors, fontFamily, habitPalette } = useAppTheme();

  const [addOpen, setAddOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [celebratingHabitId, setCelebratingHabitId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [color, setColor] = useState(habitPalette[0] ?? colors.primary);
  const [cadence, setCadence] = useState<HabitCadence>('daily');
  const [targetPerDay, setTargetPerDay] = useState('1');
  const [targetCount, setTargetCount] = useState('3');
  const [durationMinutes, setDurationMinutes] = useState('10');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 3, 5]);

  const glow = useRef(new Animated.Value(0.65)).current;
  const rewardScale = useRef(new Animated.Value(0.4)).current;
  const rewardOpacity = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => createStyles(colors, fontFamily), [colors, fontFamily]);

  useEffect(() => {
    const animation = Animated.loop(
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
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [glow]);

  useEffect(() => {
    setColor(habitPalette[0] ?? colors.primary);
  }, [habitPalette, colors.primary]);

  const totalToday = useMemo(() => {
    return state.habits.reduce((acc, habit) => acc + (habit.checkins[todayKey] ?? 0), 0);
  }, [state.habits, todayKey]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => dayjs().subtract(6 - index, 'day')),
    []
  );

  function toggleWeekday(day: number) {
    setSelectedWeekdays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => a - b)
    );
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setSubcategory('');
    setColor(habitPalette[0] ?? colors.primary);
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

    const selectedColorIndex = Math.max(
      0,
      habitPalette.findIndex((item) => item === color)
    );

    addHabit({
      title: trimmedTitle,
      color,
      colorIndex: selectedColorIndex,
      description,
      subcategory: subcategory.trim() || null,
      cadence,
      targetPerDay: Math.max(1, Number(targetPerDay) || 1),
      targetCount: Math.max(1, Number(targetCount) || 1),
      weekdays: selectedWeekdays.length ? selectedWeekdays : [1, 3, 5],
      dayOfMonth:
        cadence === 'monthly'
          ? Math.max(1, Math.min(28, Number(dayOfMonth) || 1))
          : null,
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                    isToday && {
                      borderColor: colors.primary,
                      backgroundColor: colors.cardSecondary,
                    },
                  ]}
                >
                  <Text style={styles.dayDow}>{day.format('dd').toUpperCase()}</Text>
                  <View
                    style={[
                      styles.dayDot,
                      { backgroundColor: doneAny ? colors.success : colors.border },
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
            <Text style={styles.emptyText}>
              Noch keine Habits vorhanden. Erstelle dein erstes Habit über den Plus-Button.
            </Text>
          ) : (
            state.habits.map((habit) => {
              const progressToday = habit.checkins[todayKey] ?? 0;
              const streak = streaksByHabitId[habit.id]?.current ?? 0;
              const best = streaksByHabitId[habit.id]?.best ?? 0;
              const expanded = expandedId === habit.id;
              const targetForView =
                habit.cadence === 'weekly' || habit.cadence === 'monthly'
                  ? habit.targetCount ?? 1
                  : habit.targetPerDay ?? 1;
              const isCelebrating = celebratingHabitId === habit.id;

              const themedHabitColor = getHabitPaletteColor(
                habit.colorIndex,
                habitPalette,
                colors.primary
              );

              return (
                <View key={habit.id} style={styles.habitRow}>
                  <Pressable onPress={() => handleHabitCheckin(habit.id)} style={styles.habitMain}>
                    <View
                      style={[
                        styles.habitAccent,
                        { backgroundColor: themedHabitColor },
                      ]}
                    />

                    <View style={styles.habitTextWrap}>
                      <Text style={styles.habitTitle}>{habit.title}</Text>
                      <Text style={styles.habitMeta}>
                        {cadenceLabel(habit.cadence)} · Ziel: {targetForView}x · Streak: {streak} ·
                        Best: {best}
                      </Text>

                      {habit.subcategory ? (
                        <Text style={styles.habitSubMeta}>Kategorie: {habit.subcategory}</Text>
                      ) : null}
                    </View>

                    <Animated.View
                      style={[
                        styles.progressPill,
                        progressToday >= targetForView && {
                          backgroundColor: colors.primary + '22',
                          borderColor: colors.primary,
                        },
                        isCelebrating && {
                          opacity: rewardOpacity,
                          transform: [{ scale: rewardScale }],
                        },
                      ]}
                    >
                      <Text style={styles.progressText}>
                        {progressToday}/{targetForView}
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
                      <Text style={styles.rewardBadgeText}>Stark</Text>
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
                        name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={18}
                        color={colors.text}
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
                          ]
                        );
                      }}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
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
                          Tage: {habit.weekdays.map(weekdayLabel).join(', ')}
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
        pointerEvents="none"
        style={[
          styles.fabGlow,
          {
            backgroundColor: colors.primary,
            opacity: glow.interpolate({
              inputRange: [0.65, 1],
              outputRange: [0.14, 0.32],
            }),
          },
        ]}
      />

      <Pressable onPress={() => setAddOpen(true)} style={[styles.fab, { backgroundColor: colors.primary }]}>
        <Ionicons name="add" size={30} color={colors.primaryText} />
      </Pressable>

      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Neues Habit</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Titel"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <TextInput
                value={subcategory}
                onChangeText={setSubcategory}
                placeholder="Kategorie / Bereich"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />

              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Beschreibung"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.textarea]}
                multiline
              />

              <Text style={styles.modalSectionLabel}>Farbe</Text>
              <View style={styles.pillRow}>
                {habitPalette.map((item) => {
                  const active = color === item;

                  return (
                    <Pressable
                      key={item}
                      onPress={() => setColor(item)}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: item },
                        active && styles.colorSwatchActive,
                      ]}
                    >
                      {active ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

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
                <>
                  <Text style={styles.modalSectionLabel}>Ziel pro Tag</Text>
                  <TextInput
                    value={targetPerDay}
                    onChangeText={setTargetPerDay}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.modalSectionLabel}>
                    Ziel pro {cadence === 'weekly' ? 'Woche' : 'Monat'}
                  </Text>
                  <TextInput
                    value={targetCount}
                    onChangeText={setTargetCount}
                    placeholder="3"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </>
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
                <>
                  <Text style={styles.modalSectionLabel}>Tag im Monat</Text>
                  <TextInput
                    value={dayOfMonth}
                    onChangeText={setDayOfMonth}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </>
              ) : null}

              <Text style={styles.modalSectionLabel}>Dauer in Minuten</Text>
              <TextInput
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                placeholder="10"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fontFamily: ReturnType<typeof useAppTheme>['fontFamily']
) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.text,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    headerTop: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    todayStat: {
      marginTop: 10,
      color: colors.primary,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 16,
      marginBottom: 10,
      fontFamily: fontFamily.bold,
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
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayDow: {
      color: colors.textMuted,
      fontWeight: '900',
      fontSize: 11,
      fontFamily: fontFamily.bold,
    },
    dayDot: {
      width: 8,
      height: 8,
      borderRadius: 99,
      marginTop: 6,
    },
    dayNum: {
      marginTop: 6,
      color: colors.text,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    emptyText: {
      color: colors.textMuted,
      fontWeight: '700',
      lineHeight: 20,
      fontFamily: fontFamily.regular,
    },
    habitRow: {
      backgroundColor: colors.cardSecondary,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
      fontWeight: '900',
      fontSize: 15,
      fontFamily: fontFamily.bold,
    },
    habitMeta: {
      marginTop: 4,
      color: colors.textMuted,
      fontWeight: '800',
      fontSize: 12,
      fontFamily: fontFamily.regular,
    },
    habitSubMeta: {
      marginTop: 4,
      color: colors.text,
      opacity: 0.84,
      fontSize: 12,
      fontWeight: '700',
      fontFamily: fontFamily.regular,
    },
    progressPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    progressText: {
      color: colors.text,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    rewardBadge: {
      position: 'absolute',
      right: 92,
      top: 16,
      backgroundColor: colors.primary + '22',
      borderWidth: 1,
      borderColor: colors.primary + '55',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    rewardBadgeText: {
      color: colors.primary,
      fontWeight: '900',
      fontSize: 12,
      fontFamily: fontFamily.bold,
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
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    expandedCard: {
      marginTop: 12,
      borderRadius: 14,
      backgroundColor: colors.backgroundSecondary,
      padding: 12,
    },
    expandedLabel: {
      color: colors.primary,
      fontWeight: '900',
      marginBottom: 6,
      fontFamily: fontFamily.bold,
    },
    expandedText: {
      color: colors.text,
      lineHeight: 20,
      marginBottom: 4,
      fontFamily: fontFamily.regular,
    },
    fabGlow: {
      position: 'absolute',
      right: 10,
      bottom: 10,
      width: 76,
      height: 76,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.primary + '55',
      shadowColor: colors.primary,
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
      backgroundColor: colors.backgroundSecondary,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 18,
      borderTopWidth: 1,
      borderColor: colors.border,
      maxHeight: '88%',
    },
    modalTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
      marginBottom: 14,
      fontFamily: fontFamily.bold,
    },
    input: {
      backgroundColor: colors.cardSecondary,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      marginBottom: 12,
      fontFamily: fontFamily.regular,
    },
    textarea: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
    modalSectionLabel: {
      color: colors.textMuted,
      fontWeight: '900',
      marginBottom: 8,
      marginTop: 2,
      fontFamily: fontFamily.bold,
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
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.cardSecondary,
    },
    modalPillActive: {
      backgroundColor: colors.primary + '22',
      borderColor: colors.primary + '66',
    },
    modalPillText: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 13,
      fontFamily: fontFamily.bold,
    },
    modalPillTextActive: {
      color: colors.primary,
    },
    colorSwatch: {
      width: 38,
      height: 38,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorSwatchActive: {
      borderColor: colors.text,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 6,
      marginBottom: 10,
    },
    cancelBtn: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      color: colors.text,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    submitBtn: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    submitBtnText: {
      color: colors.primaryText,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
  });
}