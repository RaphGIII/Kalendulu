import dayjs from 'dayjs';

export function formatHeaderLabel(shownDays: dayjs.Dayjs[]) {
  const first = shownDays[0];
  const last = shownDays[shownDays.length - 1];

  if (shownDays.length === 1) return first.format('ddd, D. MMM');
  return `${first.format('D. MMM')} – ${last.format('D. MMM')}`;
}

export function getShownDays(anchorDate: Date, count: number) {
  const a = dayjs(anchorDate).startOf('day');
  const c = Math.max(1, Math.min(7, count));

  const left = Math.floor((c - 1) / 2);
  const start = a.subtract(left, 'day');

  return Array.from({ length: c }, (_, i) => start.add(i, 'day'));
}