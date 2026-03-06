import { MotivationStyleId, PsycheReflection, PsycheSignals, MindsetProfile } from '../types';
import { renderReflection } from '../motivationStyles';

function pickMicroAction(p: MindsetProfile, s: PsycheSignals): string {
  if (p.discipline < 55) return 'Wähle 1 Aufgabe. Starte 10 Minuten. Nur starten.';
  if (p.consistency < 55) return 'Mach heute 1 Habit sofort (2 Minuten reichen). Streak schützen.';
  if (p.recovery < 55) return 'Plane 20 Minuten Puffer. Kein Multitasking. Nur Luft holen.';
  if (p.focus < 55) return 'Setz einen 25-Minuten Fokusblock. Handy weg. Timer an.';
  return 'Nimm den härtesten kleinen Schritt zuerst. Dann läuft der Tag.';
}

function highlightLine(p: MindsetProfile, s: PsycheSignals): string {
  const facts: string[] = [];

  if (s.habitCheckinsToday > 0) facts.push(`Heute hast du ${s.habitCheckinsToday} Habit-Check-ins gemacht.`);
  if (s.tasksDoneToday > 0) facts.push(`Du hast ${s.tasksDoneToday} Tasks erledigt.`);
  if (s.calendarHoursToday >= 4) facts.push(`Dein Tag war voll geplant (${s.calendarHoursToday.toFixed(1)}h).`);

  if (facts.length === 0) {
    // still supportive but “winner”
    return 'Heute ist ein Reset-Tag – und genau das ist die Chance: du bestimmst den nächsten Zug.';
  }

  // Convert to “identity”
  if (p.discipline >= 70) return `${facts.join(' ')} Das ist Disziplin – nicht Stimmung.`;
  if (p.consistency >= 70) return `${facts.join(' ')} Du zeigst Konstanz. Das ist selten.`;
  if (p.momentum >= 70) return `${facts.join(' ')} Du baust Momentum. Genau so gewinnt man Wochen.`;

  return `${facts.join(' ')} Gute Basis. Jetzt 1 klarer Schritt – dann kommt der Flow.`;
}

function riskLine(p: MindsetProfile, s: PsycheSignals): string | null {
  if (p.recovery < 45 && s.calendarHoursToday >= 5) return 'Zu viel Druck ohne Puffer. Plane bewusst Luft ein.';
  if (p.discipline < 45 && s.tasksTotal7d > 0 && (s.tasksDone7d / Math.max(1, s.tasksTotal7d)) < 0.35) {
    return 'Zu viele offene Schleifen. Nimm eine Sache und schließe sie.';
  }
  if (p.consistency < 45 && s.habitActiveDays7d <= 2) return 'Konstanz fehlt – starte klein, aber täglich.';
  return null;
}

export function generateReflection(args: {
  style: MotivationStyleId;
  intensity: 1 | 2 | 3;
  profile: MindsetProfile;
  signals: PsycheSignals;
}): PsycheReflection {
  const microAction = pickMicroAction(args.profile, args.signals);
  const highlight = highlightLine(args.profile, args.signals);
  const risk = riskLine(args.profile, args.signals);

  return renderReflection(args.style, {
    profile: args.profile,
    signals: args.signals,
    highlight,
    risk,
    microAction,
    intensity: args.intensity,
  });
}