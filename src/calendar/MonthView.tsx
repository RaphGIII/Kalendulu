import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

dayjs.locale('de');

type Props = {
  monthDate: Date;              // irgendein Tag im gewünschten Monat
  onSelectDay: (d: Date) => void;
};

export default function MonthView({ monthDate, onSelectDay }: Props) {
  const month = dayjs(monthDate).startOf('month');

  // Mo..So (Apple-like)
  const weekDays = useMemo(() => {
    // dayjs: 0=So ... 6=Sa; wir wollen Mo..So
    const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return labels;
  }, []);

  const cells = useMemo(() => {
    // Start: Montag der Woche, in der der 1. liegt
    const start = month.startOf('week').add(1, 'day'); // Monday
    // Falls startOf('week') bei Locale anders ist, ist das trotzdem ok – wir erzwingen Mo.
    const startMonday = start;

    // 6 Wochen = 42 Zellen (wie Apple)
    return Array.from({ length: 42 }, (_, i) => startMonday.add(i, 'day'));
  }, [month]);

  const title = month.format('MMMM YYYY');

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.weekHeader}>
        {weekDays.map((w) => (
          <Text key={w} style={styles.weekHeaderText}>{w}</Text>
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
              style={[
                styles.cell,
                isToday && styles.todayCell,
              ]}
            >
              <Text
                style={[
                  styles.cellText,
                  !inMonth && styles.outMonthText,
                  isToday && styles.todayText,
                ]}
              >
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
  title: { fontSize: 18, fontWeight: '900', color: '#202124', marginBottom: 10 },

  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  weekHeaderText: { width: '14.285%', textAlign: 'center', color: '#8A8F9C', fontWeight: '800' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  cellText: { fontWeight: '900', color: '#202124' },
  outMonthText: { color: '#B7BCC7' },

  todayCell: { backgroundColor: 'rgba(91,103,241,0.12)' },
  todayText: { color: '#5B67F1' },
});