import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import { HOURS_START, HOURS_END, HOUR_HEIGHT, clamp } from './constants';
import { getShownDays } from './date';
import { useNow } from './useNow';
import { useEvents } from './useEvents';
import EventModal from './EventModal';
import MonthView from './MonthView';
import type { CalEvent } from './types';
import { useAppTheme } from '../theme/ThemeProvider';

dayjs.locale('de');

type CalendarMode = 'month' | 'day' | 'three' | 'five' | 'seven';

type LayoutEvent = {
  event: CalEvent;
  top: number;
  height: number;
  left: number;
  width: number;
};

const HOUR_COUNT = HOURS_END - HOURS_START;
const BODY_HEIGHT = HOUR_COUNT * HOUR_HEIGHT;
const MIN_EVENT_HEIGHT = 18;
const LEFT_GUTTER_COMPACT = 54;
const DEFAULT_OPEN_HOUR = 6;

function getModeDayCount(mode: CalendarMode) {
  switch (mode) {
    case 'day':
      return 1;
    case 'three':
      return 3;
    case 'five':
      return 5;
    case 'seven':
      return 7;
    default:
      return 3;
  }
}

function getEventTop(event: CalEvent) {
  const start = dayjs(event.start);
  const hourFloat = start.hour() + start.minute() / 60;
  const clampedHour = clamp(hourFloat, HOURS_START, HOURS_END);
  return (clampedHour - HOURS_START) * HOUR_HEIGHT;
}

function getEventHeight(event: CalEvent) {
  const start = dayjs(event.start);
  const end = dayjs(event.end);
  const durationMin = Math.max(15, end.diff(start, 'minute'));
  return Math.max(MIN_EVENT_HEIGHT, (durationMin / 60) * HOUR_HEIGHT);
}

function overlaps(a: CalEvent, b: CalEvent) {
  const aStart = dayjs(a.start).valueOf();
  const aEnd = dayjs(a.end).valueOf();
  const bStart = dayjs(b.start).valueOf();
  const bEnd = dayjs(b.end).valueOf();
  return aStart < bEnd && bStart < aEnd;
}

function buildLayoutForDay(dayEvents: CalEvent[], dayWidth: number): LayoutEvent[] {
  const sorted = [...dayEvents].sort(
    (a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf(),
  );

  const columns: CalEvent[][] = [];
  const eventColumnIndex = new Map<string, number>();

  for (const event of sorted) {
    let placed = false;

    for (let i = 0; i < columns.length; i += 1) {
      const last = columns[i][columns[i].length - 1];
      if (!overlaps(last, event)) {
        columns[i].push(event);
        eventColumnIndex.set(event.id, i);
        placed = true;
        break;
      }
    }

    if (!placed) {
      columns.push([event]);
      eventColumnIndex.set(event.id, columns.length - 1);
    }
  }

  const totalColumns = Math.max(1, columns.length);
  const gap = 4;
  const width = (dayWidth - gap * (totalColumns - 1)) / totalColumns;

  return sorted.map((event) => {
    const column = eventColumnIndex.get(event.id) ?? 0;
    return {
      event,
      top: getEventTop(event),
      height: getEventHeight(event),
      left: column * (width + gap),
      width,
    };
  });
}

function getTinyTitle(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }
  return title.slice(0, 3).toUpperCase();
}

function getEventPrimaryLabel(event: CalEvent, height: number) {
  if (height < 26) return getTinyTitle(event.title);
  if (height < 38) return event.title.length > 16 ? `${event.title.slice(0, 16)}…` : event.title;
  return event.title;
}

function getEventSecondaryLabel(event: CalEvent, height: number) {
  const preferred = event.description?.trim() || event.location?.trim() || '';
  if (!preferred) return '';
  if (height < 54) return '';
  if (height < 74) return preferred.length > 18 ? `${preferred.slice(0, 18)}…` : preferred;
  if (height < 96) return preferred.length > 34 ? `${preferred.slice(0, 34)}…` : preferred;
  return preferred;
}

function getEventFontSize(height: number) {
  if (height < 26) return 9;
  if (height < 38) return 10;
  if (height < 54) return 11;
  return 12;
}

function getSubFontSize(height: number) {
  return height < 74 ? 9 : 10;
}

function buildDefaultDateFromSlot(day: dayjs.Dayjs, hour: number) {
  return day.hour(hour).minute(0).second(0).millisecond(0).toDate();
}

function ModeButton({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.modeBtn, active && styles.modeBtnActive]}>
      <Text numberOfLines={1} style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatRangeSingleLine(mode: CalendarMode, anchorDate: Date, shownDays: dayjs.Dayjs[]) {
  if (mode === 'month') {
    return dayjs(anchorDate).format('MMMM YYYY');
  }

  if (!shownDays.length) return '';

  const first = shownDays[0];
  const last = shownDays[shownDays.length - 1];

  if (shownDays.length === 1) {
    return first.format('D. MMMM');
  }

  if (first.month() === last.month()) {
    return `${first.format('D. MMM')} - ${last.format('D. MMM')}`;
  }

  return `${first.format('D. MMM')} - ${last.format('D. MMM')}`;
}

export default function WeekCalendar() {
  const { colors, fontFamily } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fontFamily), [colors, fontFamily]);

  const now = useNow();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();

  const [mode, setMode] = useState<CalendarMode>('three');
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());

  const [modalVisible, setModalVisible] = useState(false);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date>(new Date());
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);

  const verticalScrollRef = useRef<ScrollView | null>(null);

  const dayCount = mode === 'month' ? 0 : getModeDayCount(mode);
  const shownDays = useMemo(
    () => (mode === 'month' ? [] : getShownDays(anchorDate, dayCount)),
    [anchorDate, dayCount, mode],
  );

  const headerLabel = useMemo(
    () => formatRangeSingleLine(mode, anchorDate, shownDays),
    [anchorDate, mode, shownDays],
  );

  const hourLabels = useMemo(
    () => Array.from({ length: HOUR_COUNT + 1 }, (_, index) => HOURS_START + index),
    [],
  );

  useEffect(() => {
    if (mode === 'month') return;

    const scrollY = Math.max(0, (DEFAULT_OPEN_HOUR - HOURS_START) * HOUR_HEIGHT - 20);

    const id = setTimeout(() => {
      verticalScrollRef.current?.scrollTo({ y: scrollY, animated: false });
    }, 60);

    return () => clearTimeout(id);
  }, [mode, anchorDate]);

  const createFromSlot = (day: dayjs.Dayjs, hour: number) => {
    setEditingEvent(null);
    setModalDefaultDate(buildDefaultDateFromSlot(day, hour));
    setModalVisible(true);
  };

  const openExistingEvent = (event: CalEvent) => {
    setEditingEvent(event);
    setModalDefaultDate(event.start);
    setModalVisible(true);
  };

  const moveRange = (direction: -1 | 1) => {
    if (mode === 'month') {
      setAnchorDate(dayjs(anchorDate).add(direction, 'month').toDate());
      return;
    }

    const amount = getModeDayCount(mode);
    setAnchorDate(dayjs(anchorDate).add(direction * amount, 'day').toDate());
  };

  const todayLine = useMemo(() => {
    const nowValue = dayjs(now);
    const hourFloat = nowValue.hour() + nowValue.minute() / 60;
    if (hourFloat < HOURS_START || hourFloat > HOURS_END) return null;
    return (hourFloat - HOURS_START) * HOUR_HEIGHT;
  }, [now]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topCard}>
          <View style={styles.topNavRow}>
            <Pressable onPress={() => moveRange(-1)} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>‹</Text>
            </Pressable>

            <View style={styles.bigDateWrap}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.bigDateText}>
                {headerLabel}
              </Text>
            </View>

            <Pressable onPress={() => moveRange(1)} style={styles.arrowBtn}>
              <Text style={styles.arrowText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.bottomControlRow}>
            <Pressable onPress={() => setAnchorDate(new Date())} style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>Heute</Text>
            </Pressable>

            <View style={styles.modeRow}>
              <ModeButton label="M" active={mode === 'month'} onPress={() => setMode('month')} styles={styles} />
              <ModeButton label="3" active={mode === 'three'} onPress={() => setMode('three')} styles={styles} />
              <ModeButton label="5" active={mode === 'five'} onPress={() => setMode('five')} styles={styles} />
              <ModeButton label="7" active={mode === 'seven'} onPress={() => setMode('seven')} styles={styles} />
              <ModeButton label="Tag" active={mode === 'day'} onPress={() => setMode('day')} styles={styles} />
            </View>

            <Pressable
              onPress={() => {
                setEditingEvent(null);
                setModalDefaultDate(new Date());
                setModalVisible(true);
              }}
              style={styles.addBtn}
            >
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        {mode === 'month' ? (
          <View style={styles.monthWrap}>
            <MonthView
              monthDate={anchorDate}
              onSelectDay={(date) => {
                setAnchorDate(date);
                setMode('day');
              }}
            />
          </View>
        ) : (
          <ScrollView
            ref={verticalScrollRef}
            style={styles.calendarScroll}
            contentContainerStyle={styles.calendarContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.dayHeaderRow}>
              <View style={styles.timeHeaderSpacer} />
              {shownDays.map((day) => {
                const isToday = day.isSame(dayjs(), 'day');

                return (
                  <View key={day.format('YYYY-MM-DD')} style={styles.dayHeaderCell}>
                    <Text style={[styles.dayHeaderTop, isToday && styles.dayHeaderTopToday]}>
                      {day.format('dd').toUpperCase()}
                    </Text>
                    <Text style={[styles.dayHeaderBottom, isToday && styles.dayHeaderBottomToday]}>
                      {day.format('D')}
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.bodyRow}>
              <View style={styles.timeColumn}>
                {hourLabels.slice(0, -1).map((hour) => (
                  <View key={hour} style={styles.timeSlot}>
                    <Text style={styles.timeLabel}>{`${String(hour).padStart(2, '0')}:00`}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.daysArea}>
                {shownDays.map((day) => {
                  const key = day.format('YYYY-MM-DD');
                  const dayEvents = events.filter((event) => dayjs(event.start).isSame(day, 'day'));
                  const dayWidthPercent = 100 / shownDays.length;
                  const layout = buildLayoutForDay(dayEvents, 1);

                  return (
                    <View
                      key={key}
                      style={[
                        styles.dayColumn,
                        shownDays.length > 1 && { width: `${dayWidthPercent}%` },
                      ]}
                    >
                      {hourLabels.slice(0, -1).map((hour) => (
                        <Pressable
                          key={`${key}_${hour}`}
                          onPress={() => createFromSlot(day, hour)}
                          style={styles.hourCell}
                        >
                          <View style={styles.hourLine} />
                        </Pressable>
                      ))}

                      {dayjs(now).isSame(day, 'day') && todayLine !== null ? (
                        <View style={[styles.nowLineWrap, { top: todayLine }]}>
                          <View style={styles.nowDot} />
                          <View style={styles.nowLine} />
                        </View>
                      ) : null}

                      {layout.map(({ event, top, height, left, width }) => {
                        const primary = getEventPrimaryLabel(event, height);
                        const secondary = getEventSecondaryLabel(event, height);
                        const fontSize = getEventFontSize(height);
                        const subFontSize = getSubFontSize(height);
                        const compact = height < 30;

                        return (
                          <Pressable
                            key={event.id}
                            onPress={() => openExistingEvent(event)}
                            style={[
                              styles.eventCard,
                              {
                                top,
                                left: `${left * 100}%`,
                                width: `${width * 100}%`,
                                height,
                                borderLeftColor: event.color || colors.primary,
                              },
                            ]}
                          >
                            <Text
                              numberOfLines={compact ? 1 : 2}
                              style={[
                                styles.eventTitle,
                                { fontSize, lineHeight: fontSize + 2 },
                              ]}
                            >
                              {primary}
                            </Text>

                            {secondary ? (
                              <Text
                                numberOfLines={height < 96 ? 1 : 2}
                                style={[
                                  styles.eventSub,
                                  { fontSize: subFontSize, lineHeight: subFontSize + 2 },
                                ]}
                              >
                                {secondary}
                              </Text>
                            ) : null}

                            {height >= 54 ? (
                              <Text style={styles.eventTime}>
                                {dayjs(event.start).format('HH:mm')}–{dayjs(event.end).format('HH:mm')}
                              </Text>
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}

        <EventModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setEditingEvent(null);
          }}
          defaultDate={modalDefaultDate}
          initialEvent={editingEvent}
          onCreate={addEvent}
          onUpdate={updateEvent}
          onDelete={deleteEvent}
        />
      </View>
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topCard: {
      backgroundColor: colors.backgroundSecondary,
      marginHorizontal: 12,
      marginTop: 10,
      marginBottom: 6,
      borderRadius: 22,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    topNavRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    bigDateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    bigDateText: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '900',
      textAlign: 'center',
      fontFamily: fontFamily.bold,
    },
    arrowBtn: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: colors.cardSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowText: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
      lineHeight: 28,
      fontFamily: fontFamily.bold,
    },
    bottomControlRow: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    todayBtn: {
      width: 76,
      height: 40,
      borderRadius: 999,
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayBtnText: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 12,
      fontFamily: fontFamily.bold,
    },
    modeRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    modeBtn: {
      flex: 1,
      minWidth: 0,
      height: 40,
      borderRadius: 999,
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    modeBtnActive: {
      backgroundColor: colors.primary + '29',
      borderColor: colors.primary + '3D',
    },
    modeBtnText: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 11,
      fontFamily: fontFamily.bold,
    },
    modeBtnTextActive: {
      color: colors.primary,
    },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnText: {
      color: colors.primaryText,
      fontWeight: '900',
      fontSize: 24,
      lineHeight: 24,
      marginTop: -1,
      fontFamily: fontFamily.bold,
    },
    monthWrap: {
      flex: 1,
      paddingHorizontal: 14,
      paddingBottom: 14,
    },
    calendarScroll: {
      flex: 1,
    },
    calendarContent: {
      paddingHorizontal: 8,
      paddingBottom: 28,
    },
    dayHeaderRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginBottom: 4,
    },
    timeHeaderSpacer: {
      width: LEFT_GUTTER_COMPACT,
    },
    dayHeaderCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    dayHeaderTop: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    dayHeaderTopToday: {
      color: colors.primary,
    },
    dayHeaderBottom: {
      marginTop: 2,
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    dayHeaderBottomToday: {
      color: colors.primary,
    },
    bodyRow: {
      flexDirection: 'row',
    },
    timeColumn: {
      width: LEFT_GUTTER_COMPACT,
      height: BODY_HEIGHT,
      paddingRight: 4,
    },
    timeSlot: {
      height: HOUR_HEIGHT,
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
    },
    timeLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '800',
      transform: [{ translateY: -7 }],
      fontFamily: fontFamily.bold,
    },
    daysArea: {
      flex: 1,
      flexDirection: 'row',
      height: BODY_HEIGHT,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    dayColumn: {
      flex: 1,
      position: 'relative',
      borderLeftWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    hourCell: {
      height: HOUR_HEIGHT,
    },
    hourLine: {
      borderTopWidth: 1,
      borderColor: colors.border,
      width: '100%',
    },
    nowLineWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },
    nowDot: {
      width: 8,
      height: 8,
      borderRadius: 99,
      backgroundColor: colors.danger,
      marginLeft: 2,
    },
    nowLine: {
      flex: 1,
      height: 2,
      backgroundColor: colors.danger,
      marginLeft: 4,
    },
    eventCard: {
      position: 'absolute',
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: colors.cardSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      overflow: 'hidden',
      zIndex: 20,
    },
    eventTitle: {
      color: colors.text,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    eventSub: {
      color: colors.text,
      opacity: 0.82,
      fontWeight: '700',
      marginTop: 2,
      fontFamily: fontFamily.regular,
    },
    eventTime: {
      marginTop: 3,
      color: colors.primary,
      fontSize: 9,
      fontWeight: '800',
      fontFamily: fontFamily.bold,
    },
  });
}