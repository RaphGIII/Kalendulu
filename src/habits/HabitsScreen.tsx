import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import HabitGraph from './HabitGraph';
import HabitModal from './HabitModal';
import MonthHeatmap from './MonthHeatmap';
import { useHabits } from './useHabits';

dayjs.locale('de');

const BG = '#2E437A';
const BG_DARK = '#233A73';
const CARD = '#314A86';
const CARD_DARK = '#162E63';
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.72)';
const BORDER = 'rgba(255,255,255,0.10)';

export default function HabitsScreen() {
  const {
    state,
    todayKey,
    hydrated,
    last7,
    monthHeatmap,
    streaksByHabitId,
    toggleCheckin,
    addHabit,
    removeHabit,
  } = useHabits();

  const [addOpen, setAddOpen] = useState(false);

  const accent = useMemo(() => state.habits[0]?.color ?? '#D4AF37', [state.habits]);

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.16],
  });

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.32],
  });

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'day')),
    []
  );

  const today = dayjs().format('YYYY-MM-DD');

  const totalToday = useMemo(() => {
    return state.habits.reduce((acc, h) => acc + (h.checkins[todayKey] ?? 0), 0);
  }, [state.habits, todayKey]);

  if (!hydrated) {
    return (
      <View style={styles.safe}>
        <View style={styles.loaderWrap}>
          <Text style={styles.loaderText}>Lade Habits…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerTop}>
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="leaf-outline" size={22} color="#fff" />
            </View>
            <View>
              <Text style={styles.title}>Habits</Text>
              <Text style={styles.subTitle}>Heute: {totalToday} Check-ins</Text>
            </View>
          </View>
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((d) => {
            const key = d.format('YYYY-MM-DD');
            const isToday = key === today;
            const doneAny = state.habits.some((h) => (h.checkins[key] ?? 0) > 0);

            return (
              <View
                key={key}
                style={[
                  styles.dayPill,
                  isToday && { borderColor: accent, backgroundColor: 'rgba(255,255,255,0.12)' },
                ]}
              >
                <Text style={styles.dayDow}>{d.format('dd').toUpperCase()}</Text>
                <View
                  style={[
                    styles.dayDot,
                    { backgroundColor: doneAny ? accent : 'rgba(255,255,255,0.14)' },
                  ]}
                />
                <Text style={styles.dayNum}>{d.format('D')}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>Monatsübersicht</Text>
            <Text style={styles.cardHint}>Aktivität</Text>
          </View>
          <MonthHeatmap valuesByDate={monthHeatmap} accent={accent} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>Trend (7 Tage)</Text>
            <Text style={styles.cardHint}>Check-ins</Text>
          </View>
          <HabitGraph
            points={last7.map((p) => ({ label: p.label, value: p.value }))}
            accent={accent}
          />
        </View>

        <Text style={styles.section}>DEINE HABITS</Text>

        <View style={styles.habitsWrap}>
          {state.habits.map((h) => {
            const done = h.checkins[todayKey] ?? 0;
            const streak = streaksByHabitId[h.id]?.current ?? 0;
            const best = streaksByHabitId[h.id]?.best ?? 0;

            return (
              <View key={h.id} style={styles.habitRow}>
                <Pressable
                  onPress={() => toggleCheckin(h.id, todayKey)}
                  style={styles.habitMain}
                >
                  <View style={[styles.habitAccent, { backgroundColor: h.color }]} />
                  <View style={styles.habitTextWrap}>
                    <Text style={styles.habitTitle}>{h.title}</Text>
                    <Text style={styles.habitMeta}>
                      Ziel: {h.targetPerDay}× · Streak: {streak} · Best: {best}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.progressPill,
                      done >= h.targetPerDay && { backgroundColor: 'rgba(255,255,255,0.14)' },
                    ]}
                  >
                    <Text style={styles.progressText}>
                      {done}/{h.targetPerDay}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => removeHabit(h.id)}
                  style={styles.deleteButton}
                  hitSlop={10}
                >
                  <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.82)" />
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View pointerEvents="none" style={styles.fabGlowWrap}>
        <Animated.View
          style={[
            styles.fabGlow,
            {
              backgroundColor: accent,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
      </View>

      <Pressable onPress={() => setAddOpen(true)} style={[styles.fab, { backgroundColor: accent }]}>
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>

      <HabitModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={(title, color, target) => addHabit(title, color, target)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingTop: 54,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: TEXT,
    fontSize: 28,
    fontWeight: '900',
  },
  subTitle: {
    marginTop: 6,
    color: MUTED,
    fontWeight: '900',
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
  card: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  cardTitle: {
    color: TEXT,
    fontWeight: '900',
    fontSize: 16,
  },
  cardHint: {
    color: MUTED,
    fontWeight: '900',
  },
  section: {
    marginTop: 8,
    color: MUTED,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  habitsWrap: {
    gap: 12,
  },
  habitRow: {
    backgroundColor: CARD_DARK,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  habitMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitAccent: {
    width: 10,
    height: 36,
    borderRadius: 6,
  },
  habitTextWrap: {
    flex: 1,
  },
  habitTitle: {
    color: TEXT,
    fontWeight: '900',
    fontSize: 14,
  },
  habitMeta: {
    marginTop: 2,
    color: MUTED,
    fontWeight: '900',
    fontSize: 12,
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
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  fabGlowWrap: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlow: {
    width: 92,
    height: 92,
    borderRadius: 999,
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
  },
  fabPlus: {
    color: '#0B1636',
    fontSize: 32,
    fontWeight: '900',
    marginTop: -2,
  },
});