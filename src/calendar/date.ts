import dayjs from 'dayjs';

export function formatHeaderLabel(shownDays: dayjs.Dayjs[]) {
  const first = shownDays[0];
  const last = shownDays[shownDays.length - 1];

  if (shownDays.length === 1) return first.format('ddd, D. MMM');
  return `${first.format('D. MMM')} – ${last.format('D. MMM')}`;
}

export function getShownDays(anchorDate: Date, mode: 'three' | 'day') {
  const a = dayjs(anchorDate).startOf('day');
  if (mode === 'day') return [a];
  return [a.subtract(1, 'day'), a, a.add(1, 'day')];
}