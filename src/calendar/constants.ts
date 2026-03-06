export const HOURS_START = 6;
export const HOURS_END = 22;

// Höhe pro Stunde (kannst du später fürs Zooming dynamisch machen)
export const HOUR_HEIGHT = 56;

// Links: Platz für Uhrzeiten — etwas kleiner für mehr Platz bei Events
export const LEFT_GUTTER = 64;

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}