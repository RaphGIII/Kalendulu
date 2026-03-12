import type {
  GoalCategory,
  GoalDifficulty,
  GoalPlanRecommendation,
} from '../types';
import type { GoalDifficultyProfile } from './goalDifficulty';

type RecommendationInput = {
  title: string;
  category: GoalCategory;
  difficultyProfile: GoalDifficultyProfile;
  estimatedWeeksNeeded: number;
  requiredMinutesPerWeek: number;
  blockers: string[];
};

function difficultyTone(difficulty: GoalDifficulty) {
  switch (difficulty) {
    case 'very_easy':
      return {
        summaryPrefix: 'Dieses Ziel ist aktuell relativ leicht umsetzbar.',
        planningStyle: 'kurz und direkt',
      };
    case 'easy':
      return {
        summaryPrefix: 'Dieses Ziel ist gut machbar, wenn du konstant bleibst.',
        planningStyle: 'klar und übersichtlich',
      };
    case 'medium':
      return {
        summaryPrefix: 'Dieses Ziel ist realistisch, braucht aber saubere Struktur.',
        planningStyle: 'strukturiert',
      };
    case 'hard':
      return {
        summaryPrefix: 'Dieses Ziel ist anspruchsvoll und braucht ernsthafte Planung.',
        planningStyle: 'detailliert',
      };
    case 'very_hard':
      return {
        summaryPrefix: 'Dieses Ziel ist sehr anspruchsvoll und braucht ein starkes System.',
        planningStyle: 'sehr detailliert und eng geführt',
      };
  }
}

function buildTodayFocus(category: GoalCategory, difficulty: GoalDifficulty) {
  if (category === 'music') {
    if (difficulty === 'very_hard' || difficulty === 'hard') {
      return 'Heute nur einen kleinen Abschnitt tief und langsam bearbeiten statt das Ganze zu spielen.';
    }
    return 'Heute einen kurzen klaren Übeblock mit sauberem Mini-Ergebnis abschließen.';
  }

  if (category === 'study' || category === 'language') {
    if (difficulty === 'very_hard' || difficulty === 'hard') {
      return 'Heute eine Kernschwäche direkt bearbeiten und den Lernstoff nicht zu breit streuen.';
    }
    return 'Heute ein kleines Themenpaket mit klarem Output abschließen.';
  }

  if (category === 'fitness') {
    if (difficulty === 'very_hard' || difficulty === 'hard') {
      return 'Heute den wichtigsten Trainingstermin absichern und ohne Diskussion durchziehen.';
    }
    return 'Heute mit einer realistisch machbaren Trainingseinheit starten.';
  }

  return difficulty === 'very_hard' || difficulty === 'hard'
    ? 'Heute den engsten Flaschenhals bearbeiten, nicht zehn Dinge gleichzeitig.'
    : 'Heute den kleinsten sinnvollen Fortschrittsschritt abschließen.';
}

function buildNextStep(difficulty: GoalDifficulty) {
  if (difficulty === 'very_easy') return 'Den Plan sofort in den Alltag integrieren und nicht unnötig verkomplizieren.';
  if (difficulty === 'easy') return 'Die nächsten festen Blöcke setzen und direkt starten.';
  if (difficulty === 'medium') return 'Wöchentliche Struktur absichern und Fortschritt sichtbar machen.';
  if (difficulty === 'hard') return 'Plan, Engpässe und Wochenrhythmus sehr klar festziehen.';
  return 'Das Ziel in harte Teilschritte, Reviewpunkte und feste Fokusblöcke zerteilen.';
}

function buildWarning(profile: GoalDifficultyProfile, blockers: string[]) {
  const parts: string[] = [];

  if (profile.deadlinePressureScore >= 75) {
    parts.push('Die Deadline ist aktuell sehr ambitioniert.');
  }
  if (profile.uncertaintyScore >= 65) {
    parts.push('Das Zielbild ist noch zu ungenau.');
  }
  if (profile.resourceScore >= 65) {
    parts.push('Dein Alltag bietet aktuell eher knappe Ressourcen.');
  }
  if (blockers.length > 0) {
    parts.push(`Wichtigster aktueller Engpass: ${blockers[0]}.`);
  }

  return parts.length ? parts.join(' ') : undefined;
}

export function buildDifficultyAwareRecommendation(
  input: RecommendationInput
): GoalPlanRecommendation {
  const tone = difficultyTone(input.difficultyProfile.difficulty);

  return {
    summary: `${tone.summaryPrefix} Für "${input.title}" brauchst du voraussichtlich etwa ${input.estimatedWeeksNeeded} Wochen und ungefähr ${input.requiredMinutesPerWeek} Minuten fokussierte Arbeit pro Woche. Der Plan sollte ${tone.planningStyle} aufgebaut sein.`,
    todayFocus: buildTodayFocus(input.category, input.difficultyProfile.difficulty),
    nextStep: buildNextStep(input.difficultyProfile.difficulty),
    warning: buildWarning(input.difficultyProfile, input.blockers),
  };
}