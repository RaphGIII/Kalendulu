import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';

import { HOURS_START, HOURS_END, HOUR_HEIGHT, LEFT_GUTTER, clamp } from './constants';
import { formatHeaderLabel, getShownDays } from './date';
import { useNow } from './useNow';
import EventModal from './EventModal';
import { useEvents } from './useEvents';
import MonthView from './MonthView';
import { CalEvent } from './types';

dayjs.locale('de');

const GRID_LINE_OFFSET = 18;
type ViewKind = 'days' | 'month';

const VIEW_OPTIONS: Array<{ key: string; label: string; kind: ViewKind; daysCount?: number }> = [
  { key: '1', label: '1 Tag', kind: 'days', daysCount: 1 },
  { key: '2', label: '2 Tage', kind: 'days', daysCount: 2 },
  { key: '3', label: '3 Tage', kind: 'days', daysCount: 3 },
  { key: '4', label: '4 Tage', kind: 'days', daysCount: 4 },
  { key: '5', label: '5 Tage', kind: 'days', daysCount: 5 },
  { key: '7', label: '7 Tage', kind: 'days', daysCount: 7 },
  { key: 'm', label: 'Monat', kind: 'month' },
];

export default function WeekCalendar() {
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [view, setView] = useState<ViewKind>('days');
  const [daysCount, setDaysCount] = useState(3);

  const [modalVisible, setModalVisible] = useState(false);
  const [viewPickerOpen, setViewPickerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);

  const now = useNow(30_000);
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();

  const shownDays = useMemo(() => getShownDays(anchorDate, daysCount), [anchorDate, daysCount]);

  const { width } = Dimensions.get('window');
  const contentWidth = width - 16 * 2;

  const dayColumnWidth = view === 'days' ? (contentWidth - LEFT_GUTTER) / shownDays.length : 0;

  const headerLabel = useMemo(() => {
    if (view === 'month') return dayjs(anchorDate).format('MMMM YYYY');
    return formatHeaderLabel(shownDays);
  }, [view, anchorDate, shownDays]);

  const yearLabel = useMemo(() => dayjs(anchorDate).format('YYYY'), [anchorDate]);

  const viewLabel = useMemo(() => (view === 'month' ? 'Monat' : `${daysCount} Tage`), [view, daysCount]);

  const goToday = () => {
    setAnchorDate(new Date());
    setView('days');
    setDaysCount(3);
  };

  const goPrev = () => {
    const a = dayjs(anchorDate);
    if (view === 'month') setAnchorDate(a.subtract(1, 'month').toDate());
    else setAnchorDate(a.subtract(daysCount, 'day').toDate());
  };

  const goNext = () => {
    const a = dayjs(anchorDate);
    if (view === 'month') setAnchorDate(a.add(1, 'month').toDate());
    else setAnchorDate(a.add(daysCount, 'day').toDate());
  };

  const hours = useMemo(
    () => Array.from({ length: HOURS_END - HOURS_START + 1 }, (_, i) => HOURS_START + i),
    []
  );

  function eventLayout(ev: { start: Date; end: Date }) {
    if (view !== 'days') return null;

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
    if (view !== 'days') return -1;
    const t = dayjs();
    return shownDays.findIndex((d) => d.isSame(t, 'day'));
  }, [view, shownDays]);

  const onPressDayHeader = (idx: number) => {
    const day = shownDays[idx];

    if (view === 'days' && daysCount === 1 && day.isSame(dayjs(anchorDate), 'day')) {
      setDaysCount(3);
      return;
    }

    setAnchorDate(day.toDate());
    setView('days');
    setDaysCount(1);
  };

  const getChipVariant = (idx: number) => {
    const isToday = idx === todayIndex;
    const isActive = daysCount === 1 && idx === Math.floor(shownDays.length / 2);
    if (isActive) return 'active';
    if (isToday) return 'today';
    return 'default';
  };

  const nowLine = useMemo(() => {
    if (view !== 'days') return null;
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
  }, [view, now, todayIndex, dayColumnWidth]);

  // ✅ Pinch richtig herum:
  // scale > 1 => reinzoomen => weniger Tage
  // scale < 1 => rauszoomen => mehr Tage => >7 => month
  const onPinchStateChange = (e: any) => {
    if (e.nativeEvent.state !== State.END) return;

    const scale = e.nativeEvent.scale as number;

    if (scale > 1.10) {
      if (view === 'month') {
        setView('days');
        setDaysCount(7);
        return;
      }
      setDaysCount((c) => Math.max(1, c - 1));
      return;
    }

    if (scale < 0.90) {
      if (view === 'days') {
        setDaysCount((c) => {
          const next = c + 1;
          if (next > 7) {
            setView('month');
            return c;
          }
          return next;
        });
      }
    }
  };

  const setViewFromPicker = (opt: (typeof VIEW_OPTIONS)[number]) => {
    setViewPickerOpen(false);

    if (opt.kind === 'month') {
      setView('month');
      return;
    }

    setView('days');
    setDaysCount(opt.daysCount ?? 3);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.weekTitle} numberOfLines={1}>
            {headerLabel}
          </Text>

          <Pressable onPress={() => setViewPickerOpen(true)} style={styles.viewPickerBtn}>
            <Text style={styles.subTitle}>{viewLabel}</Text>
            <Text style={styles.caret}>▾</Text>
          </Pressable>
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

      {/* Dropdown */}
      <Modal visible={viewPickerOpen} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setViewPickerOpen(false)}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Ansicht wählen</Text>
            {VIEW_OPTIONS.map((opt) => (
              <Pressable key={opt.key} onPress={() => setViewFromPicker(opt)} style={styles.pickerItem}>
                <Text style={styles.pickerItemText}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <PinchGestureHandler onHandlerStateChange={onPinchStateChange}>
        <View style={{ flex: 1 }}>
          {view === 'month' ? (
            <MonthView
              monthDate={anchorDate}
              onSelectDay={(d) => {
                setAnchorDate(d);
                setView('days');
                setDaysCount(3);
              }}
            />
          ) : (
            <>
              {/* Header row */}
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
                      {/* ✅ Links wieder nur "09:00" */}
                      <View style={{ width: LEFT_GUTTER, paddingRight: 10, paddingTop: GRID_LINE_OFFSET - 8 }}>
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

                      <View style={[styles.hourLine, { top: GRID_LINE_OFFSET }]} />
                    </View>
                  ))}

                  {/* Overlay */}
                  <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                    {nowLine && (
                      <View
                        style={[
                          styles.nowLineWrap,
                          { top: nowLine.top + GRID_LINE_OFFSET, left: nowLine.left, width: nowLine.lineWidth },
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

                      // ✅ Meta (Zeit/Ort) nur wenn Box groß genug ist
                      const showTime = pos.height >= 64 && pos.width >= 88;
                      const showLocation = pos.height >= 84 && pos.width >= 110;

                      return (
                        <Pressable
                          key={ev.id}
                          onPress={() => {
                            setEditingEvent(ev);
                            setModalVisible(true);
                          }}
                          style={[
                            styles.event,
                            {
                              left: pos.left,
                              top: pos.top + GRID_LINE_OFFSET,
                              height: pos.height,
                              width: pos.width,
                              backgroundColor: ev.color,
                            },
                          ]}
                        >
                          <Text numberOfLines={2} style={styles.eventTitle}>
                            {ev.title}
                          </Text>

                          {showTime && (
                            <View style={{ marginTop: 6 }}>
                              <Text style={styles.eventTimeSmall}>{dayjs(ev.start).format('HH:mm')}</Text>
                              <Text style={styles.eventTimeSmall}>{dayjs(ev.end).format('HH:mm')}</Text>
                            </View>
                          )}

                          {showLocation && !!ev.location && (
                            <Text numberOfLines={1} style={styles.eventLocation}>
                              {ev.location}
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              <Pressable
                onPress={() => {
                  setEditingEvent(null);
                  setModalVisible(true);
                }}
                style={styles.fab}
              >
                <Text style={styles.fabPlus}>＋</Text>
              </Pressable>

              <EventModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onCreate={addEvent}
                onUpdate={updateEvent}
                onDelete={deleteEvent}
                defaultDate={anchorDate}
                initialEvent={editingEvent}
              />
            </>
          )}
        </View>
      </PinchGestureHandler>
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

  viewPickerBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: '#E8EAF2',
  },
  subTitle: { fontSize: 12, fontWeight: '800', color: '#8A8F9C' },
  caret: { fontSize: 12, fontWeight: '900', color: '#8A8F9C', marginTop: -1 },

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

  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    padding: 16,
  },
  pickerCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EAF2',
  },
  pickerTitle: { fontSize: 14, fontWeight: '900', color: '#202124', marginBottom: 10 },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  pickerItemText: { fontSize: 14, fontWeight: '800', color: '#202124' },

  headerRow: { paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-end' },
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

  grid: { position: 'relative' },

  hourRow: { position: 'relative', flexDirection: 'row', alignItems: 'flex-start' },
  hourText: { fontSize: 12, color: '#8A8F9C', fontWeight: '900' },

  dayCol: { borderLeftWidth: 1, borderLeftColor: '#EEF0F6' },
  todayColBg: { backgroundColor: 'rgba(91,103,241,0.06)' },

  hourLine: {
    position: 'absolute',
    left: LEFT_GUTTER,
    right: 0,
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
  nowDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: '#FF3B30', marginRight: 6 },
  nowLine: { height: 2, flex: 1, backgroundColor: '#FF3B30', borderRadius: 99 },

  event: {
    position: 'absolute',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },

    // ✅ verhindert “rausragen” komplett
    overflow: 'hidden',
  },
  eventTitle: { fontWeight: '900', color: '#202124', fontSize: 13 },
  eventTimeSmall: { fontSize: 11, color: '#404552', fontWeight: '800', lineHeight: 13 },
  eventLocation: { marginTop: 4, fontSize: 11, color: '#606574', fontWeight: '700' },

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