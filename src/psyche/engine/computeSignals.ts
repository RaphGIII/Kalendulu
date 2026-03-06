import dayjs from 'dayjs';
import { CalendarEventLike, HabitsStateLike, PsycheSignals, TodoStateLike } from '../types';

function dateKey(d: dayjs.Dayjs) {
  return d.format('YYYY-MM-DD');
}

function sumHours(events: CalendarEventLike[], start: dayjs.Dayjs, endExclusive: dayjs.Dayjs) {
  let totalMs = 0;
  for (const e of events) {
    const s = dayjs(e.start);
    const en = dayjs(e.end);
    if (en.isBefore(start) || s.isAfter(endExclusive)) continue;

    const ss = s.isBefore(start) ? start : s;
    const ee = en.isAfter(endExclusive) ? endExclusive : en;
    const dur = ee.diff(ss, 'millisecond');
    if (dur > 0) totalMs += dur;
  }
  return totalMs / (1000 * 60 * 60);
}

export function computeSignals(args: {
  habits: HabitsStateLike | null;
  todo: TodoStateLike | null;
  calendarEvents: CalendarEventLike[] | null;
  historySignals?: PsycheSignals[]; // for momentum
}): PsycheSignals {
  const now = dayjs();
  const today = dateKey(now);

  const start7 = now.subtract(6, 'day').startOf('day');
  const endTomorrow = now.add(1, 'day').startOf('day');

  // Habits
  let habitCheckinsToday = 0;
  let habitCheckins7d = 0;
  const activeDays = new Set<string>();

  if (args.habits?.habits?.length) {
    for (const h of args.habits.habits) {
      const todayCount = h.checkins[today] ?? 0;
      habitCheckinsToday += todayCount;

      for (let i = 0; i < 7; i++) {
        const k = dateKey(now.subtract(i, 'day'));
        const c = h.checkins[k] ?? 0;
        habitCheckins7d += c;
        if (c > 0) activeDays.add(k);
      }
    }
  }

  // To-do (best effort)
  let tasksDoneToday = 0;
  let tasksDone7d = 0;
  let tasksTotal7d = 0;

  if (args.todo?.tasks?.length) {
    // We don't have doneAt; so we approximate by createdAt window.
    const minTs = start7.valueOf();
    const maxTs = endTomorrow.valueOf();

    const tasks7 = args.todo.tasks.filter((t) => t.createdAt >= minTs && t.createdAt < maxTs);
    tasksTotal7d = tasks7.length;

    tasksDone7d = tasks7.filter((t) => t.done).length;

    // today approximation
    const todayStart = now.startOf('day').valueOf();
    const todayEnd = now.add(1, 'day').startOf('day').valueOf();
    const tasksToday = args.todo.tasks.filter((t) => t.createdAt >= todayStart && t.createdAt < todayEnd);
    tasksDoneToday = tasksToday.filter((t) => t.done).length;
  }

  // Calendar (best effort)
  let calendarHoursToday = 0;
  let calendarHours7d = 0;
  let calendarEarlyStartScore = 0;

  if (args.calendarEvents?.length) {
    calendarHours7d = sumHours(args.calendarEvents, start7, endTomorrow);

    const todayStart = now.startOf('day');
    const tomorrow = now.add(1, 'day').startOf('day');
    calendarHoursToday = sumHours(args.calendarEvents, todayStart, tomorrow);

    // early start score: if earliest event starts before 9:30 -> higher
    const todays = args.calendarEvents
      .map((e) => ({ s: dayjs(e.start) }))
      .filter((x) => x.s.isSame(now, 'day'))
      .sort((a, b) => a.s.valueOf() - b.s.valueOf());
    if (todays.length) {
      const earliest = todays[0].s;
      const minutes = earliest.hour() * 60 + earliest.minute();
      // 7:00 best, 11:00 worst
      const best = 7 * 60;
      const worst = 11 * 60;
      const t = 1 - Math.min(1, Math.max(0, (minutes - best) / (worst - best)));
      calendarEarlyStartScore = t;
    }
  }

  // Momentum: compare latest 7d signals vs previous snapshot(s)
  let momentum7d = 0;
  const hist = args.historySignals ?? [];
  if (hist.length >= 2) {
    const last = hist[hist.length - 1];
    const prev = hist[hist.length - 2];

    const lastScore = last.habitCheckins7d + last.tasksDone7d + last.calendarHours7d;
    const prevScore = prev.habitCheckins7d + prev.tasksDone7d + prev.calendarHours7d;

    const denom = Math.max(1, prevScore);
    momentum7d = (lastScore - prevScore) / denom; // -inf..+inf, but usually small
    momentum7d = Math.max(-1, Math.min(1, momentum7d));
  }

  return {
    habitCheckinsToday,
    habitCheckins7d,
    habitActiveDays7d: activeDays.size,

    tasksDoneToday,
    tasksDone7d,
    tasksTotal7d,

    calendarHoursToday,
    calendarHours7d,
    calendarEarlyStartScore,

    momentum7d,
  };
}