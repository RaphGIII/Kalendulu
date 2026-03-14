import type {
  GoalCategory,
  GoalQuestion,
  GoalRefinementResponse,
  UserPlanningProfile,
} from '../types';

type Args = {
  goal: string;
  pastGoals?: Array<{ title?: string; category?: GoalCategory }>;
  profile?: UserPlanningProfile | null;
};

function normalize(input: string) {
  return input.trim().toLowerCase();
}

function detectCategory(goal: string): GoalCategory {
  const text = normalize(goal);

  if (
    /fitness|muskel|abnehmen|laufen|sport|gym|körper|kraft|ausdauer|train/i.test(text)
  ) {
    return 'fitness';
  }

  if (
    /lernen|schule|uni|prüfung|klausur|mathe|studium|study|exam/i.test(text)
  ) {
    return 'study';
  }

  if (
    /sprache|englisch|deutsch|spanisch|französisch|italienisch|language|vokabel/i.test(text)
  ) {
    return 'language';
  }

  if (
    /job|karriere|bewerbung|arbeit|praktikum|gehalt|business|startup|kunde|verkauf/i.test(text)
  ) {
    return /business|startup|kunde|verkauf/i.test(text) ? 'business' : 'career';
  }

  if (/musik|gitarre|klavier|singen|rap|beat|song/i.test(text)) {
    return 'music';
  }

  if (/mindset|selbstbewusst|disziplin|fokus|mental|psyche|routine/i.test(text)) {
    return 'mindset';
  }

  if (/gesund|schlaf|ernährung|stress|health/i.test(text)) {
    return 'health';
  }

  if (/zeichnen|schreiben|design|kreativ|creative|video|content/i.test(text)) {
    return 'creative';
  }

  return 'other';
}

function buildBaseQuestions(goal: string, profile?: UserPlanningProfile | null): GoalQuestion[] {
  const preferredMinutes = Math.max(15, Math.min(120, profile?.preferredSessionMinutes ?? 30));

  return [
    {
      id: 'outcome',
      title: 'Was willst du ganz konkret erreichen?',
      type: 'text',
      required: true,
      placeholder: `Zum Beispiel: "${goal}" in einer messbaren Form`,
      helpText: 'So konkret wie möglich. Nicht nur Wunsch, sondern klarer Zielzustand.',
      section: 'Ziel',
    },
    {
      id: 'why',
      title: 'Warum ist dir das wirklich wichtig?',
      type: 'text',
      required: true,
      placeholder: 'Was verbessert sich dadurch in deinem Leben?',
      section: 'Ziel',
    },
    {
      id: 'current_level',
      title: 'Wo stehst du aktuell?',
      type: 'text',
      required: true,
      placeholder: 'Anfänger, schon Erfahrung, gerade wieder eingestiegen ...',
      section: 'Ausgangslage',
    },
    {
      id: 'deadline',
      title: 'Bis wann ungefähr?',
      type: 'text',
      required: true,
      placeholder: 'z. B. in 2 Wochen, in 3 Monaten, nächstes Jahr oder 15.06.2026',
      helpText: 'Relative Angaben werden verstanden und später für den Kalender genutzt.',
      section: 'Zeitrahmen',
    },
    {
      id: 'days_per_week',
      title: 'An wie vielen Tagen pro Woche kannst du realistisch daran arbeiten?',
      type: 'single_choice',
      required: true,
      options: [
        { id: '2', label: '2 Tage' },
        { id: '3', label: '3 Tage' },
        { id: '4', label: '4 Tage' },
        { id: '5', label: '5 Tage' },
        { id: '6', label: '6 Tage' },
        { id: '7', label: '7 Tage' },
      ],
      section: 'Zeitrahmen',
    },
    {
      id: 'minutes_per_day',
      title: 'Wie viele Minuten pro Tag sind realistisch?',
      type: 'single_choice',
      required: true,
      options: [
        { id: '15', label: '15 Minuten' },
        { id: '20', label: '20 Minuten' },
        { id: '30', label: '30 Minuten' },
        { id: '45', label: '45 Minuten' },
        { id: '60', label: '60 Minuten' },
        { id: '90', label: '90 Minuten' },
      ],
      helpText: `Auf Basis deines bisherigen Profils sind ${preferredMinutes} Minuten ein guter Richtwert.`,
      section: 'Zeitrahmen',
    },
    {
      id: 'best_time',
      title: 'Wann klappt es bei dir am besten?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'morning', label: 'Morgens' },
        { id: 'afternoon', label: 'Nachmittags' },
        { id: 'evening', label: 'Abends' },
        { id: 'mixed', label: 'Unterschiedlich' },
      ],
      section: 'Rhythmus',
    },
    {
      id: 'obstacles',
      title: 'Was hält dich meistens davon ab dranzubleiben?',
      type: 'multi_choice',
      required: true,
      options: [
        { id: 'time', label: 'Zu wenig Zeit' },
        { id: 'energy', label: 'Zu wenig Energie' },
        { id: 'focus', label: 'Ablenkung / fehlender Fokus' },
        { id: 'overwhelm', label: 'Ich überfordere mich schnell' },
        { id: 'unclear', label: 'Ich weiß oft nicht, was der nächste Schritt ist' },
        { id: 'discipline', label: 'Ich verliere schnell den Rhythmus' },
      ],
      section: 'Hindernisse',
    },
    {
      id: 'plan_style',
      title: 'Wie soll der Plan sich anfühlen?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'small_steps', label: 'Kleine, einfache Schritte' },
        { id: 'structured', label: 'Klar strukturiert' },
        { id: 'flexible', label: 'Flexibel, aber sinnvoll' },
        { id: 'push', label: 'Fordernd und direkt' },
      ],
      section: 'Stil',
    },
  ];
}

function buildFitnessQuestions(): GoalQuestion[] {
  return [
    {
      id: 'fitness_goal_type',
      title: 'Was ist hier das Hauptziel?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'lose_weight', label: 'Abnehmen' },
        { id: 'build_muscle', label: 'Muskelaufbau' },
        { id: 'body_recomp', label: 'Fetter runter, Form besser' },
        { id: 'routine', label: 'Trainingsroutine aufbauen' },
      ],
      section: 'Fitness',
    },
    {
      id: 'fitness_equipment',
      title: 'Wie trainierst du am ehesten?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'gym', label: 'Im Gym' },
        { id: 'home', label: 'Zuhause' },
        { id: 'outdoor', label: 'Draußen' },
        { id: 'mixed', label: 'Gemischt' },
      ],
      section: 'Fitness',
    },
    {
      id: 'fitness_food_problem',
      title: 'Was ist aktuell beim Essen das größte Problem?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'snacking', label: 'Zu viele Snacks' },
        { id: 'portion', label: 'Zu große Portionen' },
        { id: 'sweets', label: 'Süßes / Softdrinks' },
        { id: 'structure', label: 'Keine klare Struktur' },
        { id: 'not_sure', label: 'Ich bin mir nicht sicher' },
      ],
      section: 'Fitness',
    },
    {
      id: 'fitness_current_stats',
      title: 'Optional: Gewicht / Größe / grober Startpunkt',
      type: 'text',
      required: false,
      placeholder: 'z. B. 82 kg, 1,80 m, wenig Sport in letzter Zeit',
      section: 'Fitness',
    },
  ];
}

function buildStudyQuestions(): GoalQuestion[] {
  return [
    {
      id: 'study_focus',
      title: 'Was ist dein Hauptfokus?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'exam', label: 'Prüfung bestehen' },
        { id: 'understand', label: 'Stoff wirklich verstehen' },
        { id: 'catch_up', label: 'Rückstand aufholen' },
        { id: 'routine', label: 'Lernroutine aufbauen' },
      ],
      section: 'Lernen',
    },
  ];
}

function buildLanguageQuestions(): GoalQuestion[] {
  return [
    {
      id: 'language_focus',
      title: 'Was willst du vor allem verbessern?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'speaking', label: 'Sprechen' },
        { id: 'listening', label: 'Verstehen' },
        { id: 'vocabulary', label: 'Wortschatz' },
        { id: 'grammar', label: 'Grammatik' },
      ],
      section: 'Sprache',
    },
  ];
}

function buildCareerQuestions(): GoalQuestion[] {
  return [
    {
      id: 'career_focus',
      title: 'Was bringt dich hier am stärksten voran?',
      type: 'single_choice',
      required: true,
      options: [
        { id: 'applications', label: 'Bewerbungen / Akquise' },
        { id: 'portfolio', label: 'Portfolio / Projekte' },
        { id: 'network', label: 'Kontakte / Netzwerk' },
        { id: 'skill', label: 'Relevante Fähigkeit ausbauen' },
      ],
      section: 'Karriere',
    },
  ];
}

function buildOtherQuestions(): GoalQuestion[] {
  return [
    {
      id: 'success_picture',
      title: 'Woran würdest du in ein paar Wochen merken, dass du auf dem richtigen Weg bist?',
      type: 'text',
      required: true,
      placeholder: 'Was soll sichtbar anders sein?',
      section: 'Details',
    },
  ];
}

function buildCategoryQuestions(category: GoalCategory): GoalQuestion[] {
  switch (category) {
    case 'fitness':
      return buildFitnessQuestions();
    case 'study':
      return buildStudyQuestions();
    case 'language':
      return buildLanguageQuestions();
    case 'career':
    case 'business':
      return buildCareerQuestions();
    default:
      return buildOtherQuestions();
  }
}

export function buildDynamicGoalQuestionnaire({
  goal,
  pastGoals,
  profile,
}: Args): GoalRefinementResponse {
  const category = detectCategory(goal);
  const categoryQuestions = buildCategoryQuestions(category);

  const repeatedCategory = pastGoals?.some((item) => item.category === category) ?? false;

  const extraQuestion: GoalQuestion[] = repeatedCategory
    ? [
        {
          id: 'past_problem',
          title: 'Was lief bei ähnlichen Zielen bisher schief?',
          type: 'text',
          required: true,
          placeholder: 'Zu groß geplant, zu unklar, zu spät gestartet ...',
          section: 'Erfahrung',
        },
      ]
    : [];

  return {
    goalLabel: goal.trim(),
    goalType: category,
    questions: [...buildBaseQuestions(goal, profile), ...categoryQuestions, ...extraQuestion],
  };
}