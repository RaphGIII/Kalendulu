import { MotivationStyleId, PsycheReflection, PsycheSignals, MindsetProfile } from './types';

type RenderCtx = {
  profile: MindsetProfile;
  signals: PsycheSignals;
  highlight: string;
  risk: string | null;
  microAction: string;
  intensity: 1 | 2 | 3;
};

function punch(intensity: 1 | 2 | 3) {
  if (intensity === 1) return '';
  if (intensity === 2) return '  ';
  return '   ';
}

export function renderReflection(style: MotivationStyleId, ctx: RenderCtx): PsycheReflection {
  const p = ctx.profile;
  const tagBase = [
    p.discipline >= 70 ? 'Disziplin' : null,
    p.consistency >= 70 ? 'Konstanz' : null,
    p.focus >= 70 ? 'Fokus' : null,
    p.planning >= 70 ? 'Struktur' : null,
    p.recovery >= 70 ? 'Balance' : null,
    p.momentum >= 70 ? 'Momentum' : null,
  ].filter(Boolean) as string[];

  const baseTitle =
    p.momentum >= 70 ? 'Du bist im Momentum' :
    p.discipline >= 70 ? 'Du baust echte Disziplin' :
    'Heute zählt der nächste Schritt';

  const riskLine = ctx.risk ? `\n\nAchte darauf: ${ctx.risk}` : '';

  if (style === 'winner') {
    return {
      title: baseTitle,
      body:
        `Das ist nicht Glück. Das ist Charakter.` +
        `\n\n${ctx.highlight}` +
        riskLine +
        `\n\n${punch(ctx.intensity)}Du bist nicht hier, um zu “versuchen”. Du bist hier, um durchzuziehen.`,
      microAction: ctx.microAction,
      tags: tagBase.length ? tagBase : ['Winner Mode'],
    };
  }

  if (style === 'coach') {
    return {
      title: 'Kurzes Feedback für dich',
      body:
        `${ctx.highlight}` +
        riskLine +
        `\n\nEin Schritt reicht. Hauptsache: dran bleiben.`,
      microAction: ctx.microAction,
      tags: tagBase.length ? tagBase : ['Coach'],
    };
  }

  if (style === 'stoic') {
    return {
      title: 'Ruhe. Klarheit. Aktion.',
      body:
        `${ctx.highlight}` +
        (ctx.risk ? `\n\nGrenze: ${ctx.risk}` : '') +
        `\n\nHandle klein. Handle jetzt.`,
      microAction: ctx.microAction,
      tags: tagBase.length ? tagBase : ['Stoic'],
    };
  }

  // friend
  return {
    title: 'Ich seh dich.',
    body:
      `${ctx.highlight}` +
      riskLine +
      `\n\nDu musst heute nicht perfekt sein. Nur echt.`,
    microAction: ctx.microAction,
    tags: tagBase.length ? tagBase : ['Support'],
  };
}