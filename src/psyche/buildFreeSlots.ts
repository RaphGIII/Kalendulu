import dayjs from 'dayjs';

type CalendarEvent = {
  start: string | Date;
  end: string | Date;
};

export type FreeSlot = {
  start: string;
  end: string;
  durationMinutes: number;
};

export function buildFreeSlots(
  events: CalendarEvent[] | null | undefined,
  options?: {
    daysAhead?: number;
    minDurationMinutes?: number;
    startTomorrow?: boolean;
  }
): FreeSlot[] {
  const safeEvents = events ?? [];
  const now = dayjs();

  const daysAhead = options?.daysAhead ?? 7;
  const minDurationMinutes = options?.minDurationMinutes ?? 20;
  const startTomorrow = options?.startTomorrow ?? true;

  const slots: FreeSlot[] = [];

  for (let d = startTomorrow ? 1 : 0; d < daysAhead + (startTomorrow ? 1 : 0); d++) {
    const dayBase = now.add(d, 'day');
    const dayStart = dayBase.hour(8).minute(0).second(0).millisecond(0);
    const dayEnd = dayBase.hour(22).minute(0).second(0).millisecond(0);

    const dayEvents = safeEvents
      .map((e) => ({
        start: dayjs(e.start),
        end: dayjs(e.end),
      }))
      .filter((e) => e.end.isAfter(dayStart) && e.start.isBefore(dayEnd))
      .sort((a, b) => a.start.valueOf() - b.start.valueOf());

    let cursor = dayStart;

    for (const event of dayEvents) {
      const gapMinutes = event.start.diff(cursor, 'minute');

      if (gapMinutes >= minDurationMinutes) {
        slots.push({
          start: cursor.toISOString(),
          end: event.start.toISOString(),
          durationMinutes: gapMinutes,
        });
      }

      if (event.end.isAfter(cursor)) {
        cursor = event.end;
      }
    }

    const finalGap = dayEnd.diff(cursor, 'minute');
    if (finalGap >= minDurationMinutes) {
      slots.push({
        start: cursor.toISOString(),
        end: dayEnd.toISOString(),
        durationMinutes: finalGap,
      });
    }
  }

  return slots.slice(0, 30);
}