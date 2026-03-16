import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import { ACCENT_GOLD, THEME } from './colors';
import type { CalEvent } from './types';

dayjs.locale('de');

type Props = {
  monthDate: Date;
  onSelectDay: (d: Date) => void;
  events?: CalEvent[];
};

function normalizeMonthGridStart(month: dayjs.Dayjs) {
  const first = month.startOf('month');
  const weekday = first.day();
  const mondayOffset = weekday === 0 ? 6 : weekday - 1;
  return first.subtract(mondayOffset, 'day');
}

export default function MonthView({ monthDate, onSelectDay, events = [] }: Props) {
  const month = dayjs(monthDate).startOf('month');

  const weekDays = useMemo(() => ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], []);

  const cells = useMemo(() => {
    const gridStart = normalizeMonthGridStart(month);
    return Array.from({ length: 42 }, (_, i) => gridStart.add(i, 'day'));
  }, [month]);

  const monthLabel = month.format('MMMM YYYY');

  return (
    <View style={styles.wrap}>
      <View style={styles.monthHeader}>
        <Text style={styles.monthTitle}>{monthLabel}</Text>
      </View>

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
          const isWeekend = d.day() === 0 || d.day() === 6;
          const dayEvents = events.filter((event) => dayjs(event.start).isSame(d, 'day'));
          const hasEvents = dayEvents.length > 0;

          return (
            <Pressable
              key={d.format('YYYY-MM-DD')}
              onPress={() => onSelectDay(d.toDate())}
              style={[
                styles.cell,
                !inMonth && styles.outMonthCell,
                isToday && styles.todayCell,
              ]}
            >
              <View style={styles.cellTop}>
                <Text
                  style={[
                    styles.cellText,
                    !inMonth && styles.outMonthText,
                    isWeekend && inMonth && styles.weekendText,
                    isToday && styles.todayText,
                  ]}
                >
                  {d.date()}
                </Text>

                {hasEvents ? (
                  <View style={styles.eventDotsWrap}>
                    {dayEvents.slice(0, 3).map((event, index) => (
                      <View
                        key={`${event.id}_${index}`}
                        style={[
                          styles.eventDot,
                          { backgroundColor: event.color || ACCENT_GOLD },
                        ]}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.eventDotsSpacer} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  monthHeader: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.text,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  weekHeaderText: {
    width: '14.285%',
    textAlign: 'center',
    color: THEME.muted,
    fontWeight: '900',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  cell: {
    width: '13.4%',
    aspectRatio: 0.93,
    borderRadius: 18,
    paddingTop: 10,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  outMonthCell: {
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  todayCell: {
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderColor: 'rgba(212,175,55,0.34)',
    shadowColor: ACCENT_GOLD,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cellTop: {
    flex: 1,
    alignItems: 'center',
  },
  cellText: {
    fontWeight: '900',
    fontSize: 17,
    color: 'rgba(255,255,255,0.94)',
  },
  weekendText: {
    color: 'rgba(255,255,255,0.88)',
  },
  outMonthText: {
    color: 'rgba(255,255,255,0.28)',
  },
  todayText: {
    color: ACCENT_GOLD,
  },
  eventDotsWrap: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 8,
  },
  eventDotsSpacer: {
    marginTop: 8,
    minHeight: 8,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
  },
});
