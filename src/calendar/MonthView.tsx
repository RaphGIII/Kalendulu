import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { ACCENT_GOLD, THEME } from './colors';

dayjs.locale('de');

type Props = {
  monthDate: Date; // irgendein Tag im gewünschten Monat
  onSelectDay: (d: Date) => void;
};

export default function MonthView({ monthDate, onSelectDay }: Props) {
  const month = dayjs(monthDate).startOf('month');

  // Mo..So (Apple-like)
  const weekDays = useMemo(() => ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], []);

  const cells = useMemo(() => {
    // Start: Montag der Woche, in der der 1. liegt
    const startMonday = month.startOf('week').add(1, 'day'); // Monday
    // 6 Wochen = 42 Zellen (wie Apple)
    return Array.from({ length: 42 }, (_, i) => startMonday.add(i, 'day'));
  }, [month]);

  const title = month.format('MMMM YYYY');

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.weekHeader}>
        {weekDays.map((w) => (
          <Text key={w} style={styles.weekHeaderText}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((d) => {
          const inMonth = d.month() === month.month();
          const isToday = d.isSame(dayjs(), 'day');

          return (
            <Pressable
              key={d.toString()}
              onPress={() => onSelectDay(d.toDate())}
              style={[styles.cell, isToday && styles.todayCell]}
            >
              <Text style={[styles.cellText, !inMonth && styles.outMonthText, isToday && styles.todayText]}>
                {d.date()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 6 },
  title: { fontSize: 18, fontWeight: '900', color: THEME.text, marginBottom: 10 },

  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekHeaderText: { width: '14.285%', textAlign: 'center', color: THEME.muted, fontWeight: '900' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },

  cell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 6,
  },
  cellText: { fontWeight: '900', color: 'rgba(255,255,255,0.92)' },
  outMonthText: { color: 'rgba(255,255,255,0.35)' },

  // Gold glow für "Heute"
  todayCell: {
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderColor: 'rgba(212,175,55,0.35)',
  },
  todayText: { color: ACCENT_GOLD },
});