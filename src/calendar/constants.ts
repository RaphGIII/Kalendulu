export const HOURS_START = 6;
export const HOURS_END = 22;
export const HOUR_HEIGHT = 56;
export const LEFT_GUTTER = 70;

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}