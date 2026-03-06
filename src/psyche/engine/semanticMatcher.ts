import { GoalCategory, GoalSemanticMatch } from '../types';

type ConceptRule = {
  concept: string;
  category: GoalCategory;
  aliases: string[];
};

const CONCEPTS: ConceptRule[] = [
  {
    concept: 'piano',
    category: 'skill',
    aliases: [
      'klavier',
      'piano',
      'mondscheinsonate',
      'beethoven',
      'sonate',
      'musikstück',
      'stück auf klavier',
      'klassisches stück',
    ],
  },
  {
    concept: 'guitar',
    category: 'skill',
    aliases: ['gitarre', 'guitar', 'akkorde', 'riff', 'solo'],
  },
  {
    concept: 'language_learning',
    category: 'study',
    aliases: ['englisch', 'spanisch', 'sprache', 'vokabeln', 'fließend sprechen'],
  },
  {
    concept: 'school_study',
    category: 'study',
    aliases: ['lernen', 'prüfung', 'klausur', 'abi', 'mathe', 'schule', 'uni', 'noten'],
  },
  {
    concept: 'fitness_body',
    category: 'fitness',
    aliases: ['fitness', 'gym', 'muskeln', 'abnehmen', 'zunehmen', 'laufen', 'marathon'],
  },
  {
    concept: 'health_routine',
    category: 'health',
    aliases: ['schlaf', 'gesund', 'ernährung', 'meditation', 'stress reduzieren'],
  },
  {
    concept: 'career_growth',
    category: 'career',
    aliases: ['karriere', 'job', 'business', 'firma', 'kunden', 'selbstständig', 'unternehmen'],
  },
  {
    concept: 'creative_work',
    category: 'creative',
    aliases: ['zeichnen', 'malen', 'schreiben', 'komponieren', 'kreativ'],
  },
  {
    concept: 'discipline_identity',
    category: 'personal',
    aliases: ['disziplin', 'routine', 'fokus', 'selbstbewusst', 'selbstvertrauen'],
  },
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\säöüß]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique<T>(arr: T[]) {
  return [...new Set(arr)];
}

export function semanticMatchGoal(input: string): {
  category: GoalCategory;
  match: GoalSemanticMatch;
} {
  const normalizedText = normalize(input);

  const matchedConcepts: string[] = [];
  const matchedAliases: string[] = [];
  const categoryScores: Record<GoalCategory, number> = {
    skill: 0,
    fitness: 0,
    study: 0,
    career: 0,
    health: 0,
    creative: 0,
    personal: 0,
    general: 0,
  };

  for (const rule of CONCEPTS) {
    const hitAliases = rule.aliases.filter((alias) => normalizedText.includes(normalize(alias)));
    if (hitAliases.length > 0) {
      matchedConcepts.push(rule.concept);
      matchedAliases.push(...hitAliases);
      categoryScores[rule.category] += hitAliases.length;
    }
  }

  const sorted = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  const bestCategory = (best?.[1] ?? 0) > 0 ? (best[0] as GoalCategory) : 'general';

  const confidenceBase = matchedAliases.length === 0 ? 0.15 : Math.min(0.95, 0.35 + matchedAliases.length * 0.15);

  return {
    category: bestCategory,
    match: {
      normalizedText,
      matchedConcepts: unique(matchedConcepts),
      matchedAliases: unique(matchedAliases),
      confidence: confidenceBase,
    },
  };
}