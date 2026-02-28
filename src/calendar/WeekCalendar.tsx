import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { CalEvent, ViewMode } from './types';
import { HOURS_START, HOURS_END, HOUR_HEIGHT, LEFT_GUTTER, clamp } from './constants';
import { formatHeaderLabel, getShownDays } from './date';
import { useNow } from './useNow';

dayjs.locale('de');

export default function WeekCalendar() {
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [mode, setMode] = useState<ViewMode>('three');

  const now = useNow(30_000);

  const shownDays = useMemo(() => getShownDays(anchorDate, mode), [anchorDate, mode]);

  // Demo-Events (später ersetzen wir das durch echten State + CRUD)
  const events: CalEvent[] = useMemo(() => {
    const mid = dayjs(anchorDate).startOf('day');
    return [
      {
        id: '1',
        title: 'Workout',
        start: mid.hour(8).minute(0).toDate(),
        end: mid.hour(8).minute(45).toDate(),
        color: '#F8C8C8',
      },
      {
        id: '2',
        title: 'Team-Review',
        start: mid.add(1, 'day').hour(10).minute(0).toDate(),
        end: mid.add(1, 'day').hour(12).minute(0).toDate(),
        color: '#C8F8D8',
      },
      {
        id: '3',
        title: 'Roadmap-Planung',
        start: mid.subtract(1, 'day').hour(11).minute(0).toDate(),
        end: mid.subtract(1, 'day').hour(13).minute(0).toDate(),
        color: '#D8D8FF',
      },
      {
        id: '4',
        title: 'Wöchentliches Meeting',
        start: mid.add(1, 'day').hour(10).minute(0).toDate(),
        end: mid.add(1, 'day').hour(10).minute(50).toDate(),
        color: '#D8F0FF',
      },
    ];
  }, [anchorDate]);

  const { width } = Dimensions.get('window');
  const contentWidth = width - 16 * 2;
  const dayColumnWidth = (contentWidth - LEFT_GUTTER) / shownDays.length;

  const headerLabel = useMemo(() => formatHeaderLabel(shownDays), [shownDays]);
  const yearLabel = useMemo(() => dayjs(anchorDate).format('YYYY'), [anchorDate]);

  const goToday = () => {
    setAnchorDate(new Date());
    setMode('three');
  };

  const goPrev = () => {
    const a = dayjs(anchorDate);
    setAnchorDate((mode === 'day' ? a.subtract(1, 'day') : a.subtract(3, 'day')).toDate());
  };

  const goNext = () => {
    const a = dayjs(anchorDate);
    setAnchorDate((mode === 'day' ? a.add(1, 'day') : a.add(3, 'day')).toDate());
  };

  const hours = useMemo(
    () => Array.from({ length: HOURS_END - HOURS_START + 1 }, (_, i) => HOURS_START + i),
    []
  );

  function eventLayout(ev: CalEvent) {
    const start = dayjs(ev.start);
    const end = dayjs(ev.end);

    const dayIndex = shownDays.findIndex((d) => d.isSame(start, 'day'));
    if (dayIndex === -1) return null;

    const startMinutes = start.hour() * 60 + start.minute();
    const endMinutes = end.hour() * 60 + end.minute();

    const topMinutes = clamp(startMinutes - HOURS_START * 60, 0, (HOURS_END - HOURS_START) * 60);
    const heightMinutes = clamp(endMinutes - startMinutes, 24, (HOURS_END - HOURS_START) * 60);

    const top = (topMinutes / 60) * HOUR_HEIGHT;
    const height = (heightMinutes / 60) * HOUR_HEIGHT;

    const left = LEFT_GUTTER + dayIndex * dayColumnWidth + 6;
    const w = dayColumnWidth - 12;

    return { top, height, left, width: w };
  }

  const todayIndex = useMemo(() => {
    const t = dayjs();
    return shownDays.findIndex((d) => d.isSame(t, 'day'));
  }, [shownDays]);

  const activeDayIndex = useMemo(() => {
    const a = dayjs(anchorDate);
    return shownDays.findIndex((d) => d.isSame(a, 'day'));
  }, [shownDays, anchorDate]);

  const onPressDayHeader = (idx: number) => {
    const day = shownDays[idx];

    if (mode === 'day' && day.isSame(dayjs(anchorDate), 'day')) {
      setMode('three');
      return;
    }

    setAnchorDate(day.toDate());
    setMode('day');
  };

  const getChipVariant = (idx: number) => {
    const isToday = idx === todayIndex;
    const isActive = mode === 'day' && idx === activeDayIndex;
    if (isActive) return 'active';
    if (isToday) return 'today';
    return 'default';
  };

  const nowLine = useMemo(() => {
    if (todayIndex < 0) return null;

    const n = dayjs(now);
    const nowMinutes = n.hour() * 60 + n.minute();
    const minMinutes = HOURS_START * 60;
    const maxMinutes = HOURS_END * 60;

    if (nowMinutes < minMinutes || nowMinutes > maxMinutes) return null;

    const topMinutes = nowMinutes - minMinutes;
    const top = (topMinutes / 60) * HOUR_HEIGHT;

    const left = LEFT_GUTTER + todayIndex * dayColumnWidth;
    const lineWidth = dayColumnWidth;

    return { top, left, lineWidth };
  }, [now, todayIndex, dayColumnWidth]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.weekTitle}>{headerLabel}</Text>
          <Text style={styles.subTitle}>{mode === 'day' ? 'Tagesansicht' : '3-Tage-Ansicht'}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable onPress={goPrev} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>‹</Text>
          </Pressable>

          <Pressable onPress={goToday} style={styles.todayPill}>
            <Text style={styles.todayText}>HEUTE</Text>
          </Pressable>

          <Pressable onPress={goNext} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>›</Text>
          </Pressable>
        </View>
      </View>

      {/* Header row (links oben Jahr + rechts Tage) */}
      <View style={[styles.headerRow, { paddingHorizontal: 16 }]}>
        <View style={{ width: LEFT_GUTTER, alignItems: 'flex-start', justifyContent: 'flex-end', paddingBottom: 6 }}>
          <Text style={styles.yearText}>{yearLabel}</Text>
        </View>

        {shownDays.map((d, idx) => {
          const variant = getChipVariant(idx);

          const dowStyle =
            variant === 'today'
              ? [styles.dow, styles.dowToday]
              : variant === 'active'
              ? [styles.dow, styles.dowActive]
              : [styles.dow];

          const chipStyle =
            variant === 'today'
              ? [styles.dayChip, styles.dayChipToday]
              : variant === 'active'
              ? [styles.dayChip, styles.dayChipActive]
              : [styles.dayChip];

          const chipTextStyle =
            variant === 'today'
              ? [styles.dayChipText, styles.dayChipTextOnDark]
              : variant === 'active'
              ? [styles.dayChipText, styles.dayChipTextOnLightStrong]
              : [styles.dayChipText];

          return (
            <Pressable
              key={d.toString()}
              onPress={() => onPressDayHeader(idx)}
              style={{ width: dayColumnWidth, alignItems: 'center' }}
            >
              <Text style={dowStyle}>{d.format('ddd').toUpperCase()}</Text>

              <View style={chipStyle}>
                <Text style={chipTextStyle}>{d.format('D')}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Grid */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 18 }}>
        <View style={[styles.grid, { width: contentWidth }]}>
          {hours.map((h) => (
            <View key={h} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
              <View style={{ width: LEFT_GUTTER, paddingRight: 8 }}>
                <Text style={styles.hourText}>{dayjs().hour(h).minute(0).format('HH:mm')}</Text>
              </View>

              <View style={{ flexDirection: 'row', flex: 1 }}>
                {shownDays.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dayCol,
                      { width: dayColumnWidth },
                      idx === todayIndex && styles.todayColBg,
                    ]}
                  />
                ))}
              </View>

              <View style={styles.hourLine} />
            </View>
          ))}

          {/* Overlay: events + NOW line */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {nowLine && (
              <View
                style={[
                  styles.nowLineWrap,
                  {
                    top: nowLine.top + HOUR_HEIGHT * 0.12,
                    left: nowLine.left,
                    width: nowLine.lineWidth,
                  },
                ]}
                pointerEvents="none"
              >
                <View style={styles.nowDot} />
                <View style={styles.nowLine} />
              </View>
            )}

            {events.map((ev) => {
              const pos = eventLayout(ev);
              if (!pos) return null;

              return (
                <View
                  key={ev.id}
                  style={[
                    styles.event,
                    {
                      left: pos.left,
                      top: pos.top + HOUR_HEIGHT * 0.12,
                      height: pos.height,
                      width: pos.width,
                      backgroundColor: ev.color,
                    },
                  ]}
                >
                  <Text numberOfLines={2} style={styles.eventTitle}>
                    {ev.title}
                  </Text>
                  <Text style={styles.eventTime}>
                    {dayjs(ev.start).format('HH:mm')}–{dayjs(ev.end).format('HH:mm')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Pressable onPress={() => console.log('add event')} style={styles.fab}>
        <Text style={styles.fabPlus}>＋</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F8FC' },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekTitle: { fontSize: 20, fontWeight: '900', color: '#202124' },
  subTitle: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#8A8F9C' },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EAF2',
  },
  iconBtnText: { fontSize: 20, fontWeight: '800', color: '#202124', marginTop: -2 },

  todayPill: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#5B67F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: { color: 'white', fontWeight: '900', letterSpacing: 0.4 },

  headerRow: {
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  yearText: { fontSize: 12, fontWeight: '900', color: '#202124' },

  dow: { fontSize: 11, fontWeight: '800', color: '#8A8F9C' },
  dowToday: { color: '#5B67F1' },
  dowActive: { color: '#202124' },

  dayChip: {
    marginTop: 6,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E8EAF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipToday: { backgroundColor: '#5B67F1', borderColor: '#5B67F1' },
  dayChipActive: { backgroundColor: '#FFFFFF', borderColor: '#202124' },

  dayChipText: { fontWeight: '900', color: '#202124' },
  dayChipTextOnDark: { color: 'white' },
  dayChipTextOnLightStrong: { color: '#202124' },

  grid: { position: 'relative' },

  hourRow: { position: 'relative', flexDirection: 'row', alignItems: 'flex-start' },
  hourText: { fontSize: 11, color: '#8A8F9C', fontWeight: '800', marginTop: 4 },

  dayCol: { borderLeftWidth: 1, borderLeftColor: '#EEF0F6' },
  todayColBg: { backgroundColor: 'rgba(91,103,241,0.06)' },

  hourLine: {
    position: 'absolute',
    left: LEFT_GUTTER,
    right: 0,
    top: 18,
    height: 1,
    backgroundColor: '#EEF0F6',
  },

  nowLineWrap: {
    position: 'absolute',
    height: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 6,
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: '#FF3B30',
    marginRight: 6,
  },
  nowLine: {
    height: 2,
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 99,
  },

  event: {
    position: 'absolute',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  eventTitle: { fontWeight: '900', color: '#202124', fontSize: 12 },
  eventTime: { marginTop: 4, fontSize: 11, color: '#404552', fontWeight: '800' },

  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#5B67F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  fabPlus: { color: 'white', fontSize: 28, fontWeight: '900', marginTop: -2 },
});