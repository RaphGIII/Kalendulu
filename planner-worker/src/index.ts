export interface Env {
  GROQ_API_KEY: string;
  APP_SHARED_SECRET?: string;
  GROQ_MODEL_REFINE?: string;
  GROQ_MODEL_PLAN?: string;
}

type PlanDepth = 'compact' | 'balanced' | 'deep' | 'full_system';

type GoalQuestion = {
  id: string;
  title: string;
  type: 'text' | 'single_choice' | 'multi_choice' | 'long_text';
  required: boolean;
  options?: Array<{ id: string; label: string }>;
  placeholder?: string;
  helpText?: string;
  whyAsked?: string;
  priority?: number;
  section?: string;
};

type GoalRefinementResponse = {
  goalLabel: string;
  goalType: string;
  questions: GoalQuestion[];
  analysis?: {
    category?: string;
    complexity?: string;
    difficulty?: string;
    rationale?: string[];
    missingInformation?: string[];
    recommendedQuestionCount?: number;
  };
};

type PlannerReasonedText = {
  title: string;
  reason: string;
  instruction?: string;
  expectedEffect?: string;
};

type PlannerCalendarBlock = {
  title: string;
  start: string;
  end: string;
  reason: string;
  instruction?: string;
};

type PlannerRoutineBlock = {
  title: string;
  start: string;
  end: string;
};

type PlannerRoutine = {
  title: string;
  reason: string;
  instruction?: string;
  frequencyPerWeek: number;
  durationMinutes?: number;
  reviewAfterDays?: number;
  blocks: PlannerRoutineBlock[];
};

type PlannerExecutionChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

type PlannerExecutionStep = {
  id: string;
  order: number;
  title: string;
  explanation: string;
  whyItMatters: string;
  estimatedDays?: number;
  checklist: PlannerExecutionChecklistItem[];
  linkedTodoTitles: string[];
  linkedHabitTitles: string[];
};

type PlannerBundle = {
  primary: {
    todo: PlannerReasonedText;
    habit: PlannerReasonedText;
    calendar: PlannerCalendarBlock;
    routines: PlannerRoutine[];
    scheduleAdjustment?: PlannerReasonedText;
    review?: {
      reviewAfterDays: number;
      questions: string[];
    };
  };
  alternatives: Array<{
    label: string;
    todo: PlannerReasonedText;
    habit: PlannerReasonedText;
    calendar: PlannerCalendarBlock;
  }>;
  executionSteps?: PlannerExecutionStep[];
  planMeta?: {
    depth?: PlanDepth;
    difficulty?: string;
    complexity?: string;
    summary?: string;
  };
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-App-Secret',
    },
  });
}

function errorResponse(message: string, status = 400, extra?: Record<string, unknown>) {
  return jsonResponse({ error: message, ...extra }, status);
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function extractFirstJsonObject(text: string): string | null {
  const cleaned = stripCodeFences(text);
  const start = cleaned.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;

    if (depth === 0) {
      return cleaned.slice(start, i + 1);
    }
  }

  return null;
}

function tryParseJson<T>(rawText: string): T | null {
  try {
    return JSON.parse(rawText) as T;
  } catch {
    return null;
  }
}

function parseModelJsonLoose<T>(rawText: string): T | null {
  const direct = tryParseJson<T>(stripCodeFences(rawText));
  if (direct) return direct;

  const extracted = extractFirstJsonObject(rawText);
  if (!extracted) return null;

  return tryParseJson<T>(extracted);
}

async function callGroqRaw({
  env,
  model,
  system,
  user,
  temperature = 0.2,
  maxCompletionTokens = 2200,
  forceJson = false,
}: {
  env: Env;
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxCompletionTokens?: number;
  forceJson?: boolean;
}): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    temperature,
    max_completion_tokens: maxCompletionTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };

  if (forceJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Groq error ${res.status}: ${raw}`);
  }

  const parsed = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = parsed.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq returned empty content.');
  }

  return content;
}

function refinementSystemPrompt() {
  return `
You are the AI planning brain for an iOS productivity app called Kalendulu.

Return ONLY valid JSON.
No markdown.
No explanations before the JSON.
No explanations after the JSON.

Task:
1. Read the user's goal.
2. Infer goal type, difficulty, complexity.
3. Generate only the questions genuinely needed.
4. Questions must be in German.
5. Keep the JSON shape exact.

Allowed question types:
- text
- long_text
- single_choice
- multi_choice

Exact JSON shape:
{
  "goalLabel": "string",
  "goalType": "fitness|study|language|career|business|mindset|research|writing|project|other",
  "questions": [
    {
      "id": "string",
      "title": "string",
      "type": "text|long_text|single_choice|multi_choice",
      "required": true,
      "section": "string",
      "whyAsked": "string",
      "priority": 1,
      "placeholder": "string optional",
      "helpText": "string optional",
      "options": [{"id":"string","label":"string"}]
    }
  ],
  "analysis": {
    "category": "string",
    "complexity": "simple|moderate|advanced|high_complexity",
    "difficulty": "very_easy|easy|medium|hard|very_hard",
    "rationale": ["string"],
    "missingInformation": ["string"],
    "recommendedQuestionCount": 8
  }
}
`.trim();
}

function plannerSystemPrompt() {
  return `
Language: German.
Role: You are the "Execution-Planning Brain" for the iOS productivity app Kalendulu.
Task: Convert a user's goal into a deterministic, high-precision execution plan.
Output: Return ONLY valid JSON. No markdown. No prose.

Core Rule:
Every item must be a "Physical Action".
If it's not a physical movement or a specific consumption/purchase, it's not a valid step.

GOOD EXAMPLE:
Goal = Lose 5kg Fat

{
  "execution_plan": {
    "goal": "Fettverlust -5kg (Muskelerhalt-Fokus)",
    "items": [
      {
        "type": "Calendar Block",
        "title": "Ganzkörper-Krafttraining",
        "schedule": "Mo, Mi, Fr 07:00",
        "action": "3 Sätze Kniebeugen, Liegestütze, Rudern bis zum Muskelversagen."
      },
      {
        "type": "Habit",
        "title": "Protein-Sättigung",
        "schedule": "Täglich 08:00 & 13:00",
        "action": "Konsumiere 40g Protein pro Mahlzeit (Eier, Quark, Fleisch oder Tofu)."
      },
      {
        "type": "Habit",
        "title": "NEAT-Basis",
        "schedule": "Täglich bis 20:00",
        "action": "Erreiche 10.000 Schritte. Nutze Treppen statt Aufzug."
      },
      {
        "type": "Todo",
        "title": "Kühlschrank-Inventur",
        "deadline": "Heute 18:00",
        "action": "Entsorge alle verarbeiteten Süßwaren und zuckerhaltigen Getränke."
      },
      {
        "type": "Todo",
        "title": "Wochen-Einkauf",
        "deadline": "Samstag 10:00",
        "action": "Kaufe 2kg Brokkoli, 1kg Spinat, 2kg Hähnchen/Linsen, 30 Eier."
      }
    ]
  }
}

BAD EXAMPLES - AVOID THESE AT ALL COST:
- "Überlege dir ein Kaloriendefizit"
- "Erstelle einen Trainingsplan"
- "Fange an, dich gesünder zu ernähren"
- "Suche dir ein Fitnessstudio"
- "Motiviere dich täglich"
- "Beobachte dein Gewicht"

Logic:
1. Specificity: Quantities (grams, reps, steps) and times (07:00, 18:00) are mandatory where possible.
2. Logic Chain: The Todo enables the Habit. The Habit enables the Result.
3. No Thinking: The user must be able to blindly follow the instructions.

Rules:
- The first todo must be a real concrete action.
- The habit must be repeatable and directly goal-relevant.
- The calendar block must be a real work block with ISO timestamps.
- executionSteps must be the actual path to the goal, not motivational fluff.
- Large goals need stronger depth and more concrete stages.
- Use the user's available time realistically.
- Prefer direct execution over abstract preparation.
- If needed, break the path into phases.
- Keep output compact.
- No alternatives.
- No review.
- No scheduleAdjustment.
- At most 1 routine.
- At most 6 executionSteps.
- At most 3 checklist items per execution step.

Exact JSON shape:
{
  "primary": {
    "todo": {
      "title": "string",
      "reason": "string",
      "instruction": "string optional",
      "expectedEffect": "string optional"
    },
    "habit": {
      "title": "string",
      "reason": "string",
      "instruction": "string optional",
      "expectedEffect": "string optional"
    },
    "calendar": {
      "title": "string",
      "start": "ISO string",
      "end": "ISO string",
      "reason": "string",
      "instruction": "string optional"
    },
    "routines": [
      {
        "title": "string",
        "reason": "string",
        "instruction": "string optional",
        "frequencyPerWeek": 3,
        "durationMinutes": 30,
        "blocks": [
          {
            "title": "string",
            "start": "ISO string",
            "end": "ISO string"
          }
        ]
      }
    ]
  },
  "executionSteps": [
    {
      "id": "step_1",
      "order": 1,
      "title": "string",
      "explanation": "string",
      "whyItMatters": "string",
      "estimatedDays": 3,
      "checklist": [
        { "id": "c1", "label": "string", "done": false }
      ],
      "linkedTodoTitles": ["string"],
      "linkedHabitTitles": ["string"]
    }
  ],
  "planMeta": {
    "depth": "compact|balanced|deep|full_system",
    "difficulty": "very_easy|easy|medium|hard|very_hard",
    "complexity": "simple|moderate|advanced|high_complexity",
    "summary": "string"
  }
}
`.trim();
}

function buildFallbackRefinement(goal: string): GoalRefinementResponse {
  return {
    goalLabel: goal || 'Neues Ziel',
    goalType: 'other',
    questions: [
      {
        id: 'outcome',
        title: 'Was willst du ganz konkret erreichen?',
        type: 'long_text',
        required: true,
        section: 'Ziel',
        whyAsked: 'Die KI braucht ein klares Zielbild.',
        priority: 10,
        placeholder: 'Beschreibe dein Ziel möglichst konkret.',
      },
      {
        id: 'why',
        title: 'Warum ist dir dieses Ziel wirklich wichtig?',
        type: 'long_text',
        required: true,
        section: 'Motivation',
        whyAsked: 'Das Warum beeinflusst die Planstruktur.',
        priority: 9,
        placeholder: 'Was verbessert sich dadurch für dich?',
      },
      {
        id: 'deadline',
        title: 'Bis wann möchtest du das ungefähr erreichen?',
        type: 'text',
        required: true,
        section: 'Zeitrahmen',
        whyAsked: 'Der Zeitrahmen bestimmt den Plan.',
        priority: 9,
        placeholder: 'z. B. in 3 Monaten',
      },
      {
        id: 'days_per_week',
        title: 'An wie vielen Tagen pro Woche kannst du realistisch daran arbeiten?',
        type: 'single_choice',
        required: true,
        section: 'Kapazität',
        whyAsked: 'Damit der Plan realistisch bleibt.',
        priority: 8,
        options: [
          { id: '2', label: '2 Tage' },
          { id: '3', label: '3 Tage' },
          { id: '4', label: '4 Tage' },
          { id: '5', label: '5 Tage' },
          { id: '6', label: '6 Tage' },
          { id: '7', label: '7 Tage' },
        ],
      },
      {
        id: 'minutes_per_day',
        title: 'Wie viele Minuten pro Tag sind realistisch?',
        type: 'single_choice',
        required: true,
        section: 'Kapazität',
        whyAsked: 'Damit die KI keine unrealistischen Blöcke plant.',
        priority: 8,
        options: [
          { id: '15', label: '15 Minuten' },
          { id: '30', label: '30 Minuten' },
          { id: '45', label: '45 Minuten' },
          { id: '60', label: '60 Minuten' },
          { id: '90', label: '90 Minuten' },
        ],
      },
    ],
    analysis: {
      category: 'other',
      complexity: 'moderate',
      difficulty: 'medium',
      rationale: ['Fallback-Fragen wurden verwendet, weil das Modell kein sauberes JSON geliefert hat.'],
      missingInformation: ['genauer Zielzustand', 'Zeitrahmen', 'realistische Kapazität'],
      recommendedQuestionCount: 5,
    },
  };
}

function validateRefinement(data: any, fallbackGoal: string): GoalRefinementResponse {
  const rawQuestions = ensureArray<any>(data?.questions);

  const questions = rawQuestions
    .map((q, index) => {
      const type = ['text', 'single_choice', 'multi_choice', 'long_text'].includes(q?.type)
        ? q.type
        : 'text';

      const normalized = {
        id: safeString(q?.id, `q_${index + 1}`),
        title: safeString(q?.title, '').trim(),
        type,
        required: q?.required !== false,
        section: safeString(q?.section, 'Allgemein'),
        whyAsked: safeString(q?.whyAsked, ''),
        priority: safeNumber(q?.priority, 1),
        placeholder: q?.placeholder ? safeString(q.placeholder) : undefined,
        helpText: q?.helpText ? safeString(q.helpText) : undefined,
        options: Array.isArray(q?.options)
          ? q.options
              .map((opt: any, optIndex: number) => ({
                id: safeString(opt?.id, `opt_${index + 1}_${optIndex + 1}`),
                label: safeString(opt?.label, '').trim(),
              }))
              .filter((opt: { id: string; label: string }) => opt.label.length > 0)
          : undefined,
      };

      if (!normalized.title) return null;

      if (
        (type === 'single_choice' || type === 'multi_choice') &&
        (!normalized.options || normalized.options.length === 0)
      ) {
        return {
          ...normalized,
          type: 'text' as const,
          options: undefined,
        };
      }

      return normalized;
    })
    .filter(Boolean) as GoalQuestion[];

  if (!questions.length) {
    return buildFallbackRefinement(fallbackGoal);
  }

  return {
    goalLabel: safeString(data?.goalLabel, fallbackGoal || 'Neues Ziel'),
    goalType: safeString(data?.goalType, safeString(data?.analysis?.category, 'other')),
    questions,
    analysis: data?.analysis && typeof data.analysis === 'object'
      ? {
          category: safeString(data.analysis.category, 'other'),
          complexity: safeString(data.analysis.complexity, 'moderate'),
          difficulty: safeString(data.analysis.difficulty, 'medium'),
          rationale: ensureArray<string>(data.analysis.rationale),
          missingInformation: ensureArray<string>(data.analysis.missingInformation),
          recommendedQuestionCount: safeNumber(data.analysis.recommendedQuestionCount, questions.length),
        }
      : {
          category: 'other',
          complexity: 'moderate',
          difficulty: 'medium',
          rationale: [],
          missingInformation: [],
          recommendedQuestionCount: questions.length,
        },
  };
}

function buildFallbackPlanner(goalLabel = 'Dein Ziel'): PlannerBundle {
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 45 * 60 * 1000);

  return {
    primary: {
      todo: {
        title: 'Proteinreiche Lebensmittel einkaufen',
        reason: `Damit du "${goalLabel}" direkt praktisch umsetzen kannst.`,
        instruction: 'Kaufe heute konkrete Lebensmittel für 3 einfache proteinreiche Mahlzeiten.',
      },
      habit: {
        title: 'Jeden Tag proteinreich frühstücken',
        reason: 'Das macht Sättigung und Struktur beim Abnehmen deutlich einfacher.',
        instruction: 'Starte jeden Morgen mit einer klaren eiweißreichen Mahlzeit.',
      },
      calendar: {
        title: 'Ganzkörpertraining',
        start: start.toISOString(),
        end: end.toISOString(),
        reason: 'Ein fester Trainingsblock ist ein echter Fortschrittsschritt.',
        instruction: '3 Runden mit Kniebeugen, Liegestützen, Ausfallschritten und Rudern.',
      },
      routines: [
        {
          title: 'Täglicher Spaziergang',
          reason: 'Mehr Bewegung im Alltag erhöht den Kalorienverbrauch ohne Überforderung.',
          instruction: '30 Minuten zügig gehen.',
          frequencyPerWeek: 7,
          durationMinutes: 30,
          blocks: [
            {
              title: 'Spaziergang',
              start: new Date(start.getTime() + 10 * 60 * 60 * 1000).toISOString(),
              end: new Date(start.getTime() + 10 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
            },
          ],
        },
      ],
    },
    alternatives: [],
    executionSteps: [
      {
        id: 'step_1',
        order: 1,
        title: 'Ernährung sofort sauber stellen',
        explanation: 'Starte direkt mit konkreten Mahlzeiten statt nur über Ernährung nachzudenken.',
        whyItMatters: 'Abnehmen scheitert oft nicht am Wissen, sondern an fehlender Umsetzung im Alltag.',
        estimatedDays: 3,
        checklist: [
          { id: 'c1', label: 'Proteinreiche Lebensmittel einkaufen', done: false },
          { id: 'c2', label: '3 einfache Mahlzeiten für die nächsten Tage festlegen', done: false },
        ],
        linkedTodoTitles: ['Proteinreiche Lebensmittel einkaufen'],
        linkedHabitTitles: ['Jeden Tag proteinreich frühstücken'],
      },
      {
        id: 'step_2',
        order: 2,
        title: 'Festen Bewegungsrhythmus starten',
        explanation: 'Setze feste Trainingseinheiten und einfache tägliche Bewegung um.',
        whyItMatters: 'Konstanz ist beim Abnehmen stärker als einzelne motivierte Tage.',
        estimatedDays: 7,
        checklist: [
          { id: 'c3', label: 'Erstes Ganzkörpertraining absolvieren', done: false },
          { id: 'c4', label: 'An 5 Tagen spazieren gehen', done: false },
        ],
        linkedTodoTitles: [],
        linkedHabitTitles: ['Täglicher Spaziergang'],
      },
      {
        id: 'step_3',
        order: 3,
        title: 'Erste Woche stabil durchziehen',
        explanation: 'Wiederhole Ernährung und Bewegung ohne ständig alles zu ändern.',
        whyItMatters: 'Der Körper reagiert auf Wiederholung, nicht auf perfekte Einzelaktionen.',
        estimatedDays: 7,
        checklist: [
          { id: 'c5', label: '7 Tage Frühstück durchziehen', done: false },
          { id: 'c6', label: '2 Trainings absolvieren', done: false },
        ],
        linkedTodoTitles: [],
        linkedHabitTitles: ['Jeden Tag proteinreich frühstücken'],
      },
    ],
    planMeta: {
      depth: 'balanced',
      difficulty: 'medium',
      complexity: 'moderate',
      summary: 'Fallback-Plan wurde verwendet, weil der Modell-Output unvollständig war.',
    },
  };
}

function validatePlanner(data: any, fallbackGoalLabel = 'Dein Ziel'): PlannerBundle {
  const primaryTodoTitle = safeString(data?.primary?.todo?.title);
  const primaryHabitTitle = safeString(data?.primary?.habit?.title);
  const primaryCalendarTitle = safeString(data?.primary?.calendar?.title);

  if (!primaryTodoTitle || !primaryHabitTitle || !primaryCalendarTitle) {
    return buildFallbackPlanner(fallbackGoalLabel);
  }

  const routines = ensureArray<any>(data?.primary?.routines)
    .slice(0, 1)
    .map((routine, index) => ({
      title: safeString(routine?.title, `Routine ${index + 1}`),
      reason: safeString(routine?.reason, 'Wiederkehrende Routine.'),
      instruction: safeString(routine?.instruction, '') || undefined,
      frequencyPerWeek: Math.max(1, safeNumber(routine?.frequencyPerWeek, 1)),
      durationMinutes: routine?.durationMinutes
        ? safeNumber(routine.durationMinutes, 20)
        : undefined,
      blocks: ensureArray<any>(routine?.blocks).slice(0, 3).map((block, blockIndex) => ({
        title: safeString(block?.title, `Block ${blockIndex + 1}`),
        start: safeString(block?.start, new Date().toISOString()),
        end: safeString(
          block?.end,
          new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        ),
      })),
    }));

  const executionSteps = ensureArray<any>(data?.executionSteps)
    .slice(0, 6)
    .map((step, index) => ({
      id: safeString(step?.id, `step_${index + 1}`),
      order: Math.max(1, safeNumber(step?.order, index + 1)),
      title: safeString(step?.title, `Schritt ${index + 1}`),
      explanation: safeString(step?.explanation, ''),
      whyItMatters: safeString(step?.whyItMatters, ''),
      estimatedDays: step?.estimatedDays ? safeNumber(step.estimatedDays, 1) : undefined,
      checklist: ensureArray<any>(step?.checklist).slice(0, 3).map((item, itemIndex) => ({
        id: safeString(item?.id, `check_${index + 1}_${itemIndex + 1}`),
        label: safeString(item?.label, `Aufgabe ${itemIndex + 1}`),
        done: item?.done === true,
      })),
      linkedTodoTitles: ensureArray<string>(step?.linkedTodoTitles),
      linkedHabitTitles: ensureArray<string>(step?.linkedHabitTitles),
    }));

  if (!executionSteps.length) {
    return buildFallbackPlanner(fallbackGoalLabel);
  }

  return {
    primary: {
      todo: {
        title: primaryTodoTitle,
        reason: safeString(data?.primary?.todo?.reason, 'Passender nächster Schritt.'),
        instruction: safeString(data?.primary?.todo?.instruction, '') || undefined,
        expectedEffect: safeString(data?.primary?.todo?.expectedEffect, '') || undefined,
      },
      habit: {
        title: primaryHabitTitle,
        reason: safeString(data?.primary?.habit?.reason, 'Passende Gewohnheit.'),
        instruction: safeString(data?.primary?.habit?.instruction, '') || undefined,
        expectedEffect: safeString(data?.primary?.habit?.expectedEffect, '') || undefined,
      },
      calendar: {
        title: primaryCalendarTitle,
        start: safeString(data?.primary?.calendar?.start, new Date().toISOString()),
        end: safeString(
          data?.primary?.calendar?.end,
          new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        ),
        reason: safeString(data?.primary?.calendar?.reason, 'Passender Fokusblock.'),
        instruction: safeString(data?.primary?.calendar?.instruction, '') || undefined,
      },
      routines,
    },
    alternatives: [],
    executionSteps,
    planMeta: {
      depth: ['compact', 'balanced', 'deep', 'full_system'].includes(data?.planMeta?.depth)
        ? (data.planMeta.depth as PlanDepth)
        : 'balanced',
      difficulty: safeString(data?.planMeta?.difficulty, 'medium'),
      complexity: safeString(data?.planMeta?.complexity, 'moderate'),
      summary: safeString(data?.planMeta?.summary, 'Plan erfolgreich erzeugt.'),
    },
  };
}

async function handleRefine(request: Request, env: Env) {
  const body: any = await request.json().catch(() => null);
  const goal = safeString(body?.goal).trim();

  if (!goal) {
    return errorResponse('Goal is required.');
  }

  const payload = {
    goal,
    profile: body?.profile ?? null,
    pastGoals: body?.pastGoals ?? [],
    existingAnswers: body?.existingAnswers ?? {},
  };

  const model = env.GROQ_MODEL_REFINE || 'openai/gpt-oss-20b';

  const rawContent = await callGroqRaw({
    env,
    model,
    system: refinementSystemPrompt(),
    user: JSON.stringify(payload),
    temperature: 0.2,
    maxCompletionTokens: 1600,
    forceJson: true,
  });

  console.log('RAW REFINE CONTENT:\n', rawContent);

  const parsed = parseModelJsonLoose<any>(rawContent);

  if (!parsed) {
    console.log('REFINE FALLBACK USED');
    return jsonResponse(buildFallbackRefinement(goal));
  }

  return jsonResponse(validateRefinement(parsed, goal));
}

async function handleSuggest(request: Request, env: Env) {
  const body: any = await request.json().catch(() => null);
  const model = env.GROQ_MODEL_PLAN || 'openai/gpt-oss-20b';

  const rawContent = await callGroqRaw({
    env,
    model,
    system: plannerSystemPrompt(),
    user: JSON.stringify(body ?? {}),
    temperature: 0.15,
    maxCompletionTokens: 3200,
    forceJson: true,
  });

  console.log('RAW PLAN CONTENT:\n', rawContent);

  const parsed = parseModelJsonLoose<any>(rawContent);

  if (!parsed) {
    console.log('PLAN FALLBACK USED');
    return jsonResponse(buildFallbackPlanner('Dein Ziel'));
  }

  const goalLabel =
    safeString(body?.answers?.outcome) ||
    safeString(body?.goals?.[0]?.title) ||
    'Dein Ziel';

  return jsonResponse(validatePlanner(parsed, goalLabel));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return jsonResponse({}, 204);
    }

    if (env.APP_SHARED_SECRET) {
      const header = request.headers.get('X-App-Secret');
      if (header !== env.APP_SHARED_SECRET) {
        return errorResponse('Unauthorized', 401);
      }
    }

    try {
      if (url.pathname === '/goal/refine') {
        if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
        return await handleRefine(request, env);
      }

      if (url.pathname === '/planner/suggest') {
        if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
        return await handleSuggest(request, env);
      }

      if (url.pathname === '/health') {
        return jsonResponse({ ok: true });
      }

      return errorResponse('Not found', 404);
    } catch (error: any) {
      return errorResponse('Worker error', 500, {
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  },
};