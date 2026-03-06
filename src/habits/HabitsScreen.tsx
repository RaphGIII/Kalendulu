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
  } = useHabits();

  const [addOpen, setAddOpen] = useState(false);

  const accent = useMemo(() => state.habits[0]?.color ?? '#D4AF37', [state.habits]);

  // Pulsierender FAB
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.32] });

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => dayjs().subtract(6 - i, 'day')), []);
  const today = dayjs().format('YYYY-MM-DD');

  const totalToday = useMemo(() => {
    return state.habits.reduce((acc, h) => acc + (h.checkins[todayKey] ?? 0), 0);
  }, [state.habits, todayKey]);

  if (!hydrated) {
    return (
      <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '900' }}>Lade Habits…</Text>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <View style={styles.headerTop}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Habits</Text>
          <View style={{ flex: 1 }} />
          <Pressable style={styles.headerIcon}>
            <Ionicons name="stats-chart" size={18} color="rgba(255,255,255,0.92)" />
          </Pressable>
        </View>
        <Text style={styles.subTitle}>Heute: {totalToday} Check-ins</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
        {/* Week strip */}
        <View style={styles.weekRow}>
          {weekDays.map((d) => {
            const key = d.format('YYYY-MM-DD');
            const isToday = key === today;
            const doneAny = state.habits.some((h) => (h.checkins[key] ?? 0) > 0);

            return (
              <View key={key} style={[styles.dayPill, isToday && { borderColor: accent, borderWidth: 2 }]}>
                <Text style={[styles.dayDow, isToday && { color: 'rgba(255,255,255,0.95)' }]}>{d.format('dd').toUpperCase()}</Text>
                <View style={[styles.dayDot, { backgroundColor: doneAny ? accent : 'rgba(255,255,255,0.18)' }]} />
                <Text style={styles.dayNum}>{d.format('D')}</Text>
              </View>
            );
          })}
        </View>

        {/* Month heatmap */}
        <View style={[styles.card, { marginTop: 14 }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>Monatsübersicht</Text>
            <Text style={styles.cardHint}>Aktivität</Text>
          </View>
          <MonthHeatmap valuesByDate={monthHeatmap} accent={accent} />
        </View>

        {/* Trend graph */}
        <View style={[styles.card, { marginTop: 14 }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle}>Trend (7 Tage)</Text>
            <Text style={styles.cardHint}>Check-ins</Text>
          </View>
          <HabitGraph points={last7.map((p) => ({ label: p.label, value: p.value }))} accent={accent} />
        </View>

        {/* Habits list */}
        <Text style={styles.section}>DEINE HABITS</Text>
        <View style={{ gap: 12, marginTop: 12 }}>
          {state.habits.map((h) => {
            const done = h.checkins[todayKey] ?? 0;
            const streak = streaksByHabitId[h.id]?.current ?? 0;
            const best = streaksByHabitId[h.id]?.best ?? 0;

            return (
              <Pressable key={h.id} onPress={() => toggleCheckin(h.id, todayKey)} style={styles.habitRow}>
                <View style={[styles.habitAccent, { backgroundColor: h.color }]} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.habitTitle} numberOfLines={1}>{h.title}</Text>
                  <Text style={styles.habitMeta}>
                    Ziel: {h.targetPerDay}× · Streak: {streak} 🔥 · Best: {best}
                  </Text>
                </View>

                <View style={[styles.progressPill, done >= h.targetPerDay && { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
                  <Text style={styles.progressText}>{done}/{h.targetPerDay}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable onPress={() => setAddOpen(true)} style={[styles.fab, { backgroundColor: accent }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fabGlow,
            { backgroundColor: accent, opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]}
        />
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
  safe: { flex: 1, backgroundColor: BG },

  headerTop: { backgroundColor: BG_DARK, paddingTop: 54, paddingHorizontal: 18, paddingBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  title: { color: TEXT, fontSize: 28, fontWeight: '900' },
  subTitle: { marginTop: 6, color: MUTED, fontWeight: '900' },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 6 },
  dayPill: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  dayDow: { color: MUTED, fontWeight: '900', fontSize: 11 },
  dayDot: { width: 8, height: 8, borderRadius: 99, marginTop: 6 },
  dayNum: { marginTop: 6, color: 'rgba(255,255,255,0.92)', fontWeight: '900' },

  card: { backgroundColor: CARD, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: BORDER },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  cardTitle: { color: TEXT, fontWeight: '900', fontSize: 16 },
  cardHint: { color: MUTED, fontWeight: '900' },

  section: { marginTop: 16, color: MUTED, fontWeight: '900', letterSpacing: 1.1 },

  habitRow: {
    backgroundColor: CARD_DARK,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  habitAccent: { width: 10, height: 36, borderRadius: 6 },
  habitTitle: { color: TEXT, fontWeight: '900', fontSize: 14 },
  habitMeta: { marginTop: 2, color: MUTED, fontWeight: '900', fontSize: 12 },

  progressPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: BORDER,
  },
  progressText: { color: 'rgba(255,255,255,0.92)', fontWeight: '900' },

  fab: { position: 'absolute', right: 18, bottom: 18, width: 60, height: 60, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  fabGlow: { position: 'absolute', width: 92, height: 92, borderRadius: 999 },
  fabPlus: { color: '#0B1636', fontSize: 32, fontWeight: '900', marginTop: -2 },
});