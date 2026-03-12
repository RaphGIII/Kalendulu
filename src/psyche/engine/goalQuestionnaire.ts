import type {
  GoalCategory,
  GoalQuestion,
  GoalRefinementResponse,
  UserPlanningProfile,
  PsycheGoal,
} from '../types';

type BuildQuestionnaireInput = {
  goal: string;
  pastGoals?: PsycheGoal[];
  profile?: UserPlanningProfile | null;
};

function detectCategory(goal: string): GoalCategory {
  const g = goal.toLowerCase();

  if (
    g.includes('klavier') ||
    g.includes('gitarre') ||
    g.includes('violine') ||
    g.includes('drums') ||
    g.includes('mondscheinsonate') ||
    g.includes('instrument') ||
    g.includes('musik') ||
    g.includes('singen')
  ) return 'music';

  if (
    g.includes('fit') ||
    g.includes('muskel') ||
    g.includes('abnehmen') ||
    g.includes('laufen') ||
    g.includes('marathon') ||
    g.includes('fitness') ||
    g.includes('sport')
  ) return 'fitness';

  if (
    g.includes('lernen') ||
    g.includes('prüfung') ||
    g.includes('mathe') ||
    g.includes('studium') ||
    g.includes('schule') ||
    g.includes('uni')
  ) return 'study';

  if (
    g.includes('englisch') ||
    g.includes('sprache') ||
    g.includes('französisch') ||
    g.includes('spanisch')
  ) return 'language';

  if (
    g.includes('job') ||
    g.includes('karriere') ||
    g.includes('bewerbung') ||
    g.includes('arbeit') ||
    g.includes('beförderung')
  ) return 'career';

  if (
    g.includes('business') ||
    g.includes('kunden') ||
    g.includes('verkauf') ||
    g.includes('shop') ||
    g.includes('firma')
  ) return 'business';

  if (
    g.includes('selbstbewusst') ||
    g.includes('mindset') ||
    g.includes('disziplin') ||
    g.includes('mental')
  ) return 'mindset';

  if (
    g.includes('gesund') ||
    g.includes('schlaf') ||
    g.includes('stress') ||
    g.includes('ernährung')
  ) return 'health';

  if (
    g.includes('zeichnen') ||
    g.includes('schreiben') ||
    g.includes('kreativ') ||
    g.includes('design')
  ) return 'creative';

  return 'other';
}

function estimateQuestionDepth(goal: string): 'basic' | 'deep' | 'very_deep' {
  const g = goal.toLowerCase();
  let score = 0;

  const keywords = [
    'bis',
    'lernen',
    'bestehen',
    'aufbauen',
    'business',
    'firma',
    'mondscheinsonate',
    'marathon',
    'fließend',
    'professionell',
    'perfekt',
    'komplett',
  ];

  for (const word of keywords) {
    if (g.includes(word)) score += 1;
  }

  if (g.length > 40) score += 2;
  else if (g.length > 24) score += 1;

  if (score >= 4) return 'very_deep';
  if (score >= 2) return 'deep';
  return 'basic';
}

function commonQuestions(profile?: UserPlanningProfile | null): GoalQuestion[] {
  const preferredMinutes =
    typeof profile?.preferredSessionMinutes === 'number'
      ? profile.preferredSessionMinutes
      : 30;

  return [
    {
      id: 'goal_deadline',
      title: 'Bis wann möchtest du dieses Ziel erreichen?',
      type: 'date',
      required: true,
      section: 'Zielrahmen',
    },
    {
      id: 'goal_importance',
      title: 'Wie wichtig ist dir dieses Ziel gerade?',
      type: 'scale',
      required: true,
      min: 1,
      max: 10,
      step: 1,
      helpText: '1 = eher nett, 10 = extrem wichtig',
      section: 'Zielrahmen',
    },
    {
      id: 'current_level',
      title: 'Wo stehst du aktuell?',
      type: 'text',
      required: true,
      placeholder: 'z. B. Anfänger, Grundlagen vorhanden, früher gemacht ...',
      section: 'Ausgangslage',
    },
    {
      id: 'biggest_blocker',
      title: 'Was hält dich aktuell am meisten zurück?',
      type: 'text',
      required: true,
      placeholder: 'z. B. Zeit, Struktur, Unsicherheit, Aufschieben ...',
      section: 'Ausgangslage',
    },
    {
      id: 'available_days',
      title: 'An wie vielen Tagen pro Woche kannst du realistisch daran arbeiten?',
      type: 'number',
      required: true,
      min: 1,
      max: 7,
      step: 1,
      section: 'Zeit & Energie',
    },
    {
      id: 'minutes_per_day',
      title: 'Wie viele Minuten pro Einheit sind realistisch?',
      type: 'number',
      required: true,
      min: 10,
      max: 240,
      step: 5,
      helpText: `Dein Profil deutet aktuell ungefähr auf ${preferredMinutes} Minuten hin.`,
      section: 'Zeit & Energie',
    },
    {
      id: 'preferred_time',
      title: 'Wann arbeitest du am besten daran?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'morning', label: 'Morgens' },
        { id: 'afternoon', label: 'Nachmittags' },
        { id: 'evening', label: 'Abends' },
        { id: 'mixed', label: 'Unterschiedlich' },
      ],
      section: 'Zeit & Energie',
    },
    {
      id: 'learning_speed',
      title: 'Wie schnell lernst du neue Dinge normalerweise?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'slow', label: 'Eher langsam' },
        { id: 'normal', label: 'Normal' },
        { id: 'fast', label: 'Eher schnell' },
      ],
      section: 'Lernstil',
    },
    {
      id: 'motivation_pattern',
      title: 'Was hilft dir am ehesten dranzubleiben?',
      type: 'multi_choice',
      required: true,
      options: [
        { id: 'structure', label: 'Klare Struktur' },
        { id: 'small_steps', label: 'Kleine schnelle Erfolge' },
        { id: 'pressure', label: 'Etwas Druck / Deadline' },
        { id: 'variety', label: 'Abwechslung' },
        { id: 'tracking', label: 'Fortschritt sichtbar sehen' },
        { id: 'identity', label: 'Stärkeres Selbstbild' },
      ],
      section: 'Lernstil',
    },
  ];
}

function deepQuestions(): GoalQuestion[] {
  return [
    {
      id: 'why_this_goal_matters',
      title: 'Warum ist dir dieses Ziel wirklich wichtig?',
      type: 'text',
      required: true,
      placeholder: 'Was verändert sich für dich, wenn du es erreichst?',
      section: 'Tiefe Analyse',
    },
    {
      id: 'past_attempts',
      title: 'Hast du etwas Ähnliches schon einmal versucht?',
      type: 'text',
      required: false,
      placeholder: 'Was hat funktioniert, was nicht?',
      section: 'Tiefe Analyse',
    },
    {
      id: 'consistency_risk',
      title: 'Was gefährdet deine Konstanz am meisten?',
      type: 'multi_choice',
      required: true,
      options: [
        { id: 'time', label: 'Zu wenig Zeit' },
        { id: 'energy', label: 'Zu wenig Energie' },
        { id: 'overthinking', label: 'Zu viel Nachdenken statt Starten' },
        { id: 'perfectionism', label: 'Perfektionismus' },
        { id: 'chaos', label: 'Zu wenig Struktur' },
        { id: 'motivation_drop', label: 'Motivationsabfall' },
      ],
      section: 'Tiefe Analyse',
    },
  ];
}

function veryDeepQuestions(): GoalQuestion[] {
  return [
    {
      id: 'success_definition',
      title: 'Woran erkennt man ganz konkret, dass du das Ziel erreicht hast?',
      type: 'text',
      required: true,
      placeholder: 'Beschreibe das Ziel messbar und sichtbar.',
      section: 'Präzisierung',
    },
    {
      id: 'minimum_version',
      title: 'Was wäre eine kleinere, aber trotzdem wertvolle Version dieses Ziels?',
      type: 'text',
      required: false,
      placeholder: 'Falls das Hauptziel zu groß wird: was wäre eine starke Zwischenversion?',
      section: 'Präzisierung',
    },
    {
      id: 'support_system',
      title: 'Was oder wer könnte dich beim Dranbleiben unterstützen?',
      type: 'text',
      required: false,
      placeholder: 'z. B. Lehrer, Coach, Freund, Umgebung, Tools ...',
      section: 'Präzisierung',
    },
    {
      id: 'stress_response',
      title: 'Wie reagierst du meist, wenn Druck steigt?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'perform_better', label: 'Ich liefere eher besser' },
        { id: 'mixed', label: 'Mal so, mal so' },
        { id: 'avoidance', label: 'Ich neige dann zum Aufschieben' },
      ],
      section: 'Präzisierung',
    },
  ];
}

function musicQuestions(): GoalQuestion[] {
  return [
    {
      id: 'music_experience',
      title: 'Wie viel instrumentale Vorerfahrung hast du?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'none', label: 'Keine' },
        { id: 'little', label: 'Wenig' },
        { id: 'some', label: 'Etwas' },
        { id: 'strong', label: 'Viel' },
      ],
      section: 'Fachspezifisch',
    },
    {
      id: 'music_reading',
      title: 'Kannst du Noten lesen?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'no', label: 'Nein' },
        { id: 'basic', label: 'Ein bisschen' },
        { id: 'yes', label: 'Ja' },
      ],
      section: 'Fachspezifisch',
    },
    {
      id: 'music_main_gap',
      title: 'Was fehlt dir am meisten?',
      type: 'multi_choice',
      required: true,
      options: [
        { id: 'technique', label: 'Technik' },
        { id: 'timing', label: 'Timing / Rhythmus' },
        { id: 'coordination', label: 'Koordination' },
        { id: 'consistency', label: 'Konstanz' },
        { id: 'theory', label: 'Theorie / Notenverständnis' },
        { id: 'confidence', label: 'Sicherheit' },
      ],
      section: 'Fachspezifisch',
    },
  ];
}

function fitnessQuestions(): GoalQuestion[] {
  return [
    {
      id: 'fitness_goal_type',
      title: 'Worum geht es hauptsächlich?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'lose_weight', label: 'Abnehmen' },
        { id: 'build_muscle', label: 'Muskelaufbau' },
        { id: 'endurance', label: 'Ausdauer' },
        { id: 'general', label: 'Allgemein fitter werden' },
      ],
      section: 'Fachspezifisch',
    },
    {
      id: 'fitness_current_state',
      title: 'Wie aktiv bist du aktuell?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'inactive', label: 'Kaum aktiv' },
        { id: 'light', label: 'Etwas aktiv' },
        { id: 'moderate', label: 'Regelmäßig aktiv' },
        { id: 'strong', label: 'Sehr aktiv' },
      ],
      section: 'Fachspezifisch',
    },
    {
      id: 'fitness_limitations',
      title: 'Gibt es Einschränkungen oder Probleme?',
      type: 'text',
      required: false,
      placeholder: 'z. B. Knie, Rücken, wenig Schlaf ...',
      section: 'Fachspezifisch',
    },
  ];
}

function studyQuestions(): GoalQuestion[] {
  return [
    {
      id: 'study_subject',
      title: 'Welches Fach oder Thema ist es genau?',
      type: 'text',
      required: true,
      section: 'Fachspezifisch',
    },
    {
      id: 'study_exam_date',
      title: 'Gibt es eine Prüfung oder einen festen Termin?',
      type: 'date',
      required: false,
      section: 'Fachspezifisch',
    },
    {
      id: 'study_main_problem',
      title: 'Was ist aktuell das größte Lernproblem?',
      type: 'multi_choice',
      required: true,
      options: [
        { id: 'focus', label: 'Konzentration' },
        { id: 'understanding', label: 'Verständnis' },
        { id: 'consistency', label: 'Zu unregelmäßig' },
        { id: 'memory', label: 'Merken / Wiederholen' },
        { id: 'overwhelm', label: 'Zu viel Stoff' },
      ],
      section: 'Fachspezifisch',
    },
  ];
}

function languageQuestions(): GoalQuestion[] {
  return [
    {
      id: 'language_name',
      title: 'Welche Sprache ist es?',
      type: 'text',
      required: true,
      section: 'Fachspezifisch',
    },
    {
      id: 'language_level',
      title: 'Wie ist dein aktuelles Niveau?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'a0', label: 'Anfänger ohne Vorkenntnisse' },
        { id: 'a1', label: 'A1/A2' },
        { id: 'b1', label: 'B1/B2' },
        { id: 'c1', label: 'C1+' },
      ],
      section: 'Fachspezifisch',
    },
    {
      id: 'language_priority',
      title: 'Was ist am wichtigsten?',
      type: 'multi_choice',
      required: true,
      options: [
        { id: 'speaking', label: 'Sprechen' },
        { id: 'listening', label: 'Hören' },
        { id: 'writing', label: 'Schreiben' },
        { id: 'reading', label: 'Lesen' },
        { id: 'vocabulary', label: 'Wortschatz' },
        { id: 'grammar', label: 'Grammatik' },
      ],
      section: 'Fachspezifisch',
    },
  ];
}

function defaultQuestions(): GoalQuestion[] {
  return [
    {
      id: 'custom_success_definition',
      title: 'Woran erkennt man ganz konkret, dass du das Ziel erreicht hast?',
      type: 'text',
      required: true,
      placeholder: 'Beschreibe das Ergebnis möglichst konkret.',
      section: 'Fachspezifisch',
    },
    {
      id: 'custom_main_gap',
      title: 'Was fehlt zwischen deinem aktuellen Stand und dem Ziel am meisten?',
      type: 'text',
      required: true,
      section: 'Fachspezifisch',
    },
  ];
}

function buildCategoryQuestions(category: GoalCategory): GoalQuestion[] {
  switch (category) {
    case 'music':
      return musicQuestions();
    case 'fitness':
      return fitnessQuestions();
    case 'study':
      return studyQuestions();
    case 'language':
      return languageQuestions();
    default:
      return defaultQuestions();
  }
}

export function buildDynamicGoalQuestionnaire(
  input: BuildQuestionnaireInput
): GoalRefinementResponse {
  const category = detectCategory(input.goal);
  const depth = estimateQuestionDepth(input.goal);

  const base = [...commonQuestions(input.profile), ...buildCategoryQuestions(category)];
  const extraDeep = depth === 'deep' || depth === 'very_deep' ? deepQuestions() : [];
  const maxDeep = depth === 'very_deep' ? veryDeepQuestions() : [];

  return {
    goalLabel: input.goal.trim(),
    goalType: category,
    questions: [...base, ...extraDeep, ...maxDeep],
  };
}