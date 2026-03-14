import { MotivationStyleId, PsycheReflection, PsycheSignals, MindsetProfile } from './types';

type ReflectionContext = {
  style: MotivationStyleId;
  microAction: string;
  signals: PsycheSignals;
  profile: MindsetProfile;
};

export function buildMotivationReflection(ctx: ReflectionContext): PsycheReflection {
  const baseTitle = 'Bleib im Rhythmus.';
  const momentum = ctx.signals.momentum7d;
  const consistency = ctx.profile.consistency;

  if (ctx.style === 'winner') {
    return {
      title: baseTitle,
      message:
        momentum >= 60
          ? 'Du bist gerade in Bewegung. Halt den Lauf am Leben.'
          : 'Nicht diskutieren, liefern. Mach den nächsten klaren Schritt.',
      body: 'Gewinnen entsteht aus wiederholter Umsetzung, nicht aus perfekter Stimmung.',
      action: ctx.microAction,
      tone: 'winner',
    };
  }

  if (ctx.style === 'coach') {
    return {
      title: 'Kurzes Feedback für dich',
      message:
        consistency >= 60
          ? 'Deine Basis ist da. Jetzt zählt der nächste saubere Schritt.'
          : 'Du brauchst keinen perfekten Tag, sondern einen ehrlichen Neustart.',
      body: 'Ein kleiner umgesetzter Schritt schlägt langes Nachdenken.',
      action: ctx.microAction,
      tone: 'coach',
    };
  }

  if (ctx.style === 'stoic') {
    return {
      title: 'Ruhe. Klarheit. Aktion.',
      message: 'Konzentrier dich auf das, was du jetzt direkt beeinflussen kannst.',
      body: 'Nicht alles lösen. Den nächsten sinnvollen Schritt lösen.',
      action: ctx.microAction,
      tone: 'stoic',
    };
  }

  return {
    title: 'Ich seh dich.',
    message:
      momentum >= 50
        ? 'Du bist näher dran, als du denkst. Bleib dran.'
        : 'Starte klein, aber starte wirklich.',
    body: 'Fortschritt entsteht, wenn du heute wieder auftauchst.',
    action: ctx.microAction,
    tone: ctx.style,
  };
}