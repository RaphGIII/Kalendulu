type PsycheGoal = {
  id: string;
  title: string;
};

type PsycheSignals = {
  habitCheckinsToday: number;
  habitCheckins7d: number;
  habitActiveDays7d: number;
  tasksDoneToday: number;
  tasksDone7d: number;
  tasksTotal7d: number;
  calendarHoursToday: number;
  calendarHours7d: number;
  calendarEarlyStartScore: number;
  momentum7d: number;
};

type MindsetProfile = {
  discipline: number;
  consistency: number;
  focus: number;
  planning: number;
  recovery: number;
  momentum: number;
};

type FreeSlot = {
  start: string;
  end: string;
  durationMinutes?: number;
};

type UserPlanningProfile = {
  energyWindow: 'morning' | 'afternoon' | 'evening' | 'mixed';
  planningStyle: 'structured' | 'flexible' | 'mixed';
  startStyle: 'gentle' | 'balanced' | 'intense';
  frictionPoints: string[];
  motivationDrivers: string[];
  preferredSessionMinutes: number;
  consistencyScore: number;
  completionStyle: 'small_steps' | 'deadline_pressure' | 'varied';
  successfulPatterns: string[];
  failedPatterns: string[];
};

type GoalAnswerMap = Record<string, string | string[]>;

type GoalQuestionOption = {
  id: string;
  label: string;
};

type GoalQuestion = {
  id: string;
  title: string;
  type: 'text' | 'single_choice' | 'multi_choice';
  required: boolean;
  options?: GoalQuestionOption[];
  placeholder?: string;
};

type GoalRefineRequest = {
  goal: string;
  pastGoals: PsycheGoal[];
  profile: UserPlanningProfile;
  existingAnswers?: GoalAnswerMap;
};

type GoalRefinementResponse = {
  goalLabel: string;
  goalType: string;
  questions: GoalQuestion[];
};

type PlannerRequest = {
  goals: PsycheGoal[];
  profile: MindsetProfile;
  signals: PsycheSignals;
  freeSlots?: FreeSlot[];
  answers?: GoalAnswerMap;
  userPlanningProfile?: UserPlanningProfile;
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
};

type Env = {
  GROQ_API_KEY: string;
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST,OPTIONS,GET',
      ...(init?.headers ?? {}),
    },
  });
}

function topGoal(goals: PsycheGoal[]): string {
  return goals[0]?.title?.trim() || 'Ein persönliches Ziel';
}

function extractJsonObject(text: string): any | null {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // ignore
  }

  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    const slice = trimmed.slice(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeGoalRefinement(data: any): GoalRefinementResponse | null {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.goalLabel !== 'string') return null;
  if (typeof data.goalType !== 'string') return null;
  if (!Array.isArray(data.questions)) return null;

  const questions: GoalQuestion[] = data.questions
    .filter(
      (q: any) =>
        q &&
        typeof q.id === 'string' &&
        typeof q.title === 'string' &&
        (q.type === 'text' || q.type === 'single_choice' || q.type === 'multi_choice') &&
        typeof q.required === 'boolean'
    )
    .map((q: any) => ({
      id: q.id.trim(),
      title: q.title.trim(),
      type: q.type,
      required: q.required,
      options: Array.isArray(q.options)
        ? q.options
            .filter((o: any) => o && typeof o.id === 'string' && typeof o.label === 'string')
            .map((o: any) => ({
              id: o.id.trim(),
              label: o.label.trim(),
            }))
            .slice(0, 10)
        : undefined,
      placeholder: typeof q.placeholder === 'string' ? q.placeholder.trim() : undefined,
    }))
    .slice(0, 10);

  if (!questions.length) return null;

  return {
    goalLabel: data.goalLabel.trim(),
    goalType: data.goalType.trim(),
    questions,
  };
}

function normalizePlannerBundle(data: any): PlannerBundle | null {
  if (!data || typeof data !== 'object') return null;
  if (!data.primary || typeof data.primary !== 'object') return null;
  if (!Array.isArray(data.alternatives)) return null;

  const validText = (x: any) =>
    x &&
    typeof x.title === 'string' &&
    typeof x.reason === 'string';

  const validCalendar = (x: any) =>
    x &&
    typeof x.title === 'string' &&
    typeof x.start === 'string' &&
    typeof x.end === 'string' &&
    typeof x.reason === 'string';

  const primary = data.primary;

  if (!validText(primary.todo)) return null;
  if (!validText(primary.habit)) return null;
  if (!validCalendar(primary.calendar)) return null;

  const routines: PlannerRoutine[] = Array.isArray(primary.routines)
    ? primary.routines
        .filter(
          (r: any) =>
            r &&
            typeof r.title === 'string' &&
            typeof r.reason === 'string' &&
            typeof r.frequencyPerWeek === 'number' &&
            Array.isArray(r.blocks)
        )
        .map((r: any) => ({
          title: r.title.trim(),
          reason: r.reason.trim(),
          instruction: typeof r.instruction === 'string' ? r.instruction.trim() : undefined,
          frequencyPerWeek: r.frequencyPerWeek,
          durationMinutes:
            typeof r.durationMinutes === 'number' ? r.durationMinutes : undefined,
          reviewAfterDays:
            typeof r.reviewAfterDays === 'number' ? r.reviewAfterDays : undefined,
          blocks: r.blocks
            .filter(
              (b: any) =>
                b &&
                typeof b.title === 'string' &&
                typeof b.start === 'string' &&
                typeof b.end === 'string'
            )
            .map((b: any) => ({
              title: b.title.trim(),
              start: b.start,
              end: b.end,
            })),
        }))
        .filter((r: PlannerRoutine) => r.blocks.length > 0)
        .slice(0, 2)
    : [];

  const alternatives = data.alternatives
    .filter(
      (a: any) =>
        a &&
        typeof a.label === 'string' &&
        validText(a.todo) &&
        validText(a.habit) &&
        validCalendar(a.calendar)
    )
    .map((a: any) => ({
      label: a.label.trim(),
      todo: {
        title: a.todo.title.trim(),
        reason: a.todo.reason.trim(),
        instruction:
          typeof a.todo.instruction === 'string' ? a.todo.instruction.trim() : undefined,
        expectedEffect:
          typeof a.todo.expectedEffect === 'string'
            ? a.todo.expectedEffect.trim()
            : undefined,
      },
      habit: {
        title: a.habit.title.trim(),
        reason: a.habit.reason.trim(),
        instruction:
          typeof a.habit.instruction === 'string'
            ? a.habit.instruction.trim()
            : undefined,
        expectedEffect:
          typeof a.habit.expectedEffect === 'string'
            ? a.habit.expectedEffect.trim()
            : undefined,
      },
      calendar: {
        title: a.calendar.title.trim(),
        start: a.calendar.start,
        end: a.calendar.end,
        reason: a.calendar.reason.trim(),
        instruction:
          typeof a.calendar.instruction === 'string'
            ? a.calendar.instruction.trim()
            : undefined,
      },
    }))
    .slice(0, 3);

  return {
    primary: {
      todo: {
        title: primary.todo.title.trim(),
        reason: primary.todo.reason.trim(),
        instruction:
          typeof primary.todo.instruction === 'string'
            ? primary.todo.instruction.trim()
            : undefined,
        expectedEffect:
          typeof primary.todo.expectedEffect === 'string'
            ? primary.todo.expectedEffect.trim()
            : undefined,
      },
      habit: {
        title: primary.habit.title.trim(),
        reason: primary.habit.reason.trim(),
        instruction:
          typeof primary.habit.instruction === 'string'
            ? primary.habit.instruction.trim()
            : undefined,
        expectedEffect:
          typeof primary.habit.expectedEffect === 'string'
            ? primary.habit.expectedEffect.trim()
            : undefined,
      },
      calendar: {
        title: primary.calendar.title.trim(),
        start: primary.calendar.start,
        end: primary.calendar.end,
        reason: primary.calendar.reason.trim(),
        instruction:
          typeof primary.calendar.instruction === 'string'
            ? primary.calendar.instruction.trim()
            : undefined,
      },
      routines,
      scheduleAdjustment: validText(primary.scheduleAdjustment)
        ? {
            title: primary.scheduleAdjustment.title.trim(),
            reason: primary.scheduleAdjustment.reason.trim(),
            instruction:
              typeof primary.scheduleAdjustment.instruction === 'string'
                ? primary.scheduleAdjustment.instruction.trim()
                : undefined,
            expectedEffect:
              typeof primary.scheduleAdjustment.expectedEffect === 'string'
                ? primary.scheduleAdjustment.expectedEffect.trim()
                : undefined,
          }
        : undefined,
      review:
        primary.review &&
        typeof primary.review.reviewAfterDays === 'number' &&
        Array.isArray(primary.review.questions)
          ? {
              reviewAfterDays: primary.review.reviewAfterDays,
              questions: primary.review.questions
                .filter((q: any) => typeof q === 'string')
                .slice(0, 5),
            }
          : undefined,
    },
    alternatives,
  };
}

function buildFallbackGoalRefinement(body: GoalRefineRequest): GoalRefinementResponse {
  const goal = body.goal?.trim() || 'Dein Ziel';

  return {
    goalLabel: goal,
    goalType: 'generic',
    questions: [
      {
        id: 'meaning',
        title: 'Was meinst du mit diesem Ziel ganz konkret?',
        type: 'text',
        required: true,
        placeholder: 'Beschreibe das Ziel in deinen eigenen Worten',
      },
      {
        id: 'reason',
        title: 'Warum ist dir dieses Ziel gerade wichtig?',
        type: 'text',
        required: true,
        placeholder: 'Was soll sich dadurch in deinem Leben verändern?',
      },
      {
        id: 'obstacle',
        title: 'Was steht dir bisher am meisten im Weg?',
        type: 'single_choice',
        required: true,
        options: [
          { id: 'time', label: 'Zeit' },
          { id: 'energy', label: 'Energie' },
          { id: 'consistency', label: 'Konstanz' },
          { id: 'clarity', label: 'Unklarheit' },
          { id: 'stress', label: 'Stress' },
        ],
      },
      {
        id: 'intensity',
        title: 'Wie willst du starten?',
        type: 'single_choice',
        required: true,
        options: [
          { id: 'gentle', label: 'Sanft' },
          { id: 'balanced', label: 'Normal' },
          { id: 'intense', label: 'Intensiv' },
        ],
      },
      {
        id: 'success',
        title: 'Woran würdest du in einigen Wochen merken, dass es funktioniert?',
        type: 'text',
        required: false,
        placeholder: 'Woran willst du Fortschritt erkennen?',
      },
      {
        id: 'best_time',
        title: 'Wann passt dieses Ziel am ehesten in dein Leben?',
        type: 'single_choice',
        required: false,
        options: [
          { id: 'morning', label: 'Morgens' },
          { id: 'afternoon', label: 'Tagsüber' },
          { id: 'evening', label: 'Abends' },
          { id: 'mixed', label: 'Unterschiedlich' },
        ],
      },
    ],
  };
}

function pickRoutineBlocks(
  freeSlots: FreeSlot[],
  desiredCount: number,
  blockMinutes: number
) {
  const picked: PlannerRoutineBlock[] = [];
  const usedDays = new Set<string>();

  for (const slot of freeSlots) {
    if (picked.length >= desiredCount) break;

    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const slotMinutes = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 60000)
    );

    if (slotMinutes < blockMinutes) continue;

    const dayKey = slot.start.slice(0, 10);
    if (usedDays.has(dayKey)) continue;

    const blockEnd = new Date(start.getTime() + blockMinutes * 60000);

    picked.push({
      title: 'Routine',
      start: start.toISOString(),
      end: blockEnd.toISOString(),
    });

    usedDays.add(dayKey);
  }

  return picked;
}

function buildFallbackPlanner(body: PlannerRequest): PlannerBundle {
  const goal = topGoal(body.goals);
  const slot = body.freeSlots?.[0];

  const start = slot?.start ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const end =
    slot?.end ??
    new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();

  const routineBlocks = pickRoutineBlocks(body.freeSlots ?? [], 2, 30).map((b) => ({
    ...b,
    title: `${goal} Routine`,
  }));

  return {
    primary: {
      todo: {
        title: `Setze heute eine klare Anweisung für "${goal}" um`,
        reason: 'Eine konkrete Ausführungsanweisung ist wirksamer als ein vager Vorsatz.',
        instruction: `Lege den kleinsten realen Schritt für "${goal}" noch heute fest und führe ihn aus.`,
        expectedEffect: 'Der Einstieg wird leichter und der Widerstand sinkt.',
      },
      habit: {
        title: `2 Minuten täglich für "${goal}" reservieren`,
        reason: 'Ein sehr kleines Habit erhöht die Chance auf echte Konstanz.',
        instruction: `Verknüpfe das Habit mit einem festen Auslöser im Alltag.`,
        expectedEffect: 'Wiederholung entsteht, ohne dass es überfordernd wirkt.',
      },
      calendar: {
        title: goal,
        start,
        end,
        reason: 'Ein fixer Slot schafft Verbindlichkeit statt nur guter Absicht.',
        instruction: 'Nutze diesen Block nur für dieses Ziel und starte ohne Ablenkung.',
      },
      routines:
        routineBlocks.length > 0
          ? [
              {
                title: `${goal} Routine`,
                reason:
                  'Mehrere feste Wiederholungen pro Woche erhöhen die Chance, dass das Ziel wirklich Teil des Alltags wird.',
                instruction:
                  'Behandle diese Blöcke wie feste Vereinbarungen und verschiebe sie nur bewusst.',
                frequencyPerWeek: routineBlocks.length,
                durationMinutes: 30,
                reviewAfterDays: 14,
                blocks: routineBlocks,
              },
            ]
          : [],
      scheduleAdjustment: {
        title: `Reserviere feste Wochenzeit für "${goal}"`,
        reason:
          'Das Ziel wirkt wichtig genug, um mehr als spontane Restzeit zu bekommen.',
        instruction:
          'Plane bewusst wiederkehrende Zeit statt auf Motivation in Lücken zu hoffen.',
      },
      review: {
        reviewAfterDays: 7,
        questions: [
          'Hat dir dieser Plan tatsächlich geholfen?',
          'War die Intensität passend oder zu hoch?',
          'Welcher Teil hat die größte Wirkung gezeigt?',
        ],
      },
    },
    alternatives: [
      {
        label: 'Ungewöhnlich',
        todo: {
          title: `Verändere die Umgebung für "${goal}" statt nur deinen Willen`,
          reason:
            'Oft liegt der größte Hebel nicht im Willen, sondern in der Struktur und Umgebung.',
          instruction:
            'Ordne deinen Alltag so um, dass die gewünschte Handlung leichter und die alte Reibung schwerer wird.',
          expectedEffect: 'Weniger innere Reibung und mehr automatische Umsetzung.',
        },
        habit: {
          title: `Nutze ein Mini-Ritual als Startsignal für "${goal}"`,
          reason: 'Ein Ritual senkt die mentale Einstiegsschwelle.',
          instruction:
            'Führe immer denselben kleinen Startschritt direkt vor der eigentlichen Handlung aus.',
          expectedEffect: 'Der Übergang vom Denken ins Handeln wird leichter.',
        },
        calendar: {
          title: `${goal} Reset`,
          start,
          end,
          reason: 'Ein bewusster Startblock kann wirksamer sein als lose Motivation.',
          instruction:
            'Nutze diesen Termin nicht zum Perfektionismus, sondern für einen klaren Neustart.',
        },
      },
    ],
  };
}

function buildGoalRefinementPrompt() {
  return [
    'Du erzeugst hochqualitative Rückfragen für eine Zielklärungs-App.',
    'Die Fragen sollen sich an das konkrete Ziel und an das bisherige Nutzerprofil anpassen.',
    'Das Ziel ist, ein grobes Ziel in ein tiefes, persönliches und planbares Ziel zu verwandeln.',
    'Die Fragen dürfen emotionale, praktische, identitätsbezogene und strategische Ebenen abdecken.',
    'Erstelle 6 bis 10 wirklich gute Fragen.',
    'Nutze eine Mischung aus text, single_choice und multi_choice.',
    'Die Fragen sollen klug, attraktiv und relevant wirken.',
    'Vermeide langweilige Standardfragen.',
    'Antworte ausschließlich als JSON.',
    'Format:',
    '{',
    '  "goalLabel": "string",',
    '  "goalType": "string",',
    '  "questions": [',
    '    {',
    '      "id": "string",',
    '      "title": "string",',
    '      "type": "text | single_choice | multi_choice",',
    '      "required": true,',
    '      "placeholder": "string optional",',
    '      "options": [{"id":"string","label":"string"}]',
    '    }',
    '  ]',
    '}',
    'Keine Analyse. Kein Markdown. Kein Text außerhalb des JSON.',
  ].join('\n');
}

function buildPlannerPrompt() {
  return [
    'Du bist eine außergewöhnlich kreative, psychologisch kluge Planungs-KI.',
    'Du bekommst:',
    '- Ziel',
    '- frühere Ziele',
    '- Antworten auf vertiefende Rückfragen',
    '- Produktivitätssignale',
    '- Nutzerprofil',
    '- freie Kalender-Slots',
    '',
    'Erstelle kein banales Standard-Ergebnis.',
    'Vermeide generische Tipps wie "mehr spazieren", "einfach öfter trainieren", "mehr schlafen", außer sie sind extrem personalisiert.',
    '',
    'Antworte mit einem Bundle aus:',
    '- primary: Hauptplan',
    '- alternatives: 2 alternative Richtungen',
    '- routines: 0 bis 2 Routinen mit mehreren Terminen pro Woche',
    '- optional scheduleAdjustment: wenn im Zeitplan etwas klar fehlt',
    '- review: Nach wie vielen Tagen Wirkung geprüft werden soll und welche Fragen dann gestellt werden sollen',
    '',
    'Denke in diesen Richtungen:',
    '- behavior design',
    '- friction reduction',
    '- environmental design',
    '- identity reinforcement',
    '- emotional regulation',
    '- recovery strategy',
    '',
    'Regeln:',
    '- Todo = konkret, originell, nicht banal, eher als klare Anweisung formuliert.',
    '- Habit = klein, aber intelligent und spürbar.',
    '- Calendar = sinnvoller freier Slot ab morgen, niemals in der Vergangenheit.',
    '- Routines dürfen mehrfach pro Woche geplant werden, z.B. Training 3x/Woche.',
    '- Nutze nur freie Slots aus freeSlots.',
    '- scheduleAdjustment soll einen Zeitplan-Hinweis geben, wenn das Ziel eigentlich schon Kalenderraum bräuchte.',
    '- Jede Komponente braucht eine klare reason.',
    '- Gib nach Möglichkeit instruction und expectedEffect zurück.',
    '- Mindestens eine Alternative soll ungewöhnlich und überraschend sein, aber realistisch.',
    '',
    'Antworte ausschließlich als JSON.',
    'Format:',
    '{',
    '  "primary": {',
    '    "todo": { "title": "string", "reason": "string", "instruction": "string", "expectedEffect": "string" },',
    '    "habit": { "title": "string", "reason": "string", "instruction": "string", "expectedEffect": "string" },',
    '    "calendar": { "title": "string", "start": "ISO", "end": "ISO", "reason": "string", "instruction": "string" },',
    '    "routines": [',
    '      {',
    '        "title": "string",',
    '        "reason": "string",',
    '        "instruction": "string",',
    '        "frequencyPerWeek": 3,',
    '        "durationMinutes": 35,',
    '        "reviewAfterDays": 14,',
    '        "blocks": [{ "title": "string", "start": "ISO", "end": "ISO" }]',
    '      }',
    '    ],',
    '    "scheduleAdjustment": { "title": "string", "reason": "string", "instruction": "string", "expectedEffect": "string" },',
    '    "review": { "reviewAfterDays": 7, "questions": ["string"] }',
    '  },',
    '  "alternatives": [',
    '    {',
    '      "label": "string",',
    '      "todo": { "title": "string", "reason": "string", "instruction": "string", "expectedEffect": "string" },',
    '      "habit": { "title": "string", "reason": "string", "instruction": "string", "expectedEffect": "string" },',
    '      "calendar": { "title": "string", "start": "ISO", "end": "ISO", "reason": "string", "instruction": "string" }',
    '    }',
    '  ]',
    '}',
    'Keine Analyse. Kein Markdown. Kein Text außerhalb des JSON.',
  ].join('\n');
}

async function callGroqGoalRefinement(
  env: Env,
  body: GoalRefineRequest
): Promise<GoalRefinementResponse> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_completion_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: buildGoalRefinementPrompt(),
        },
        {
          role: 'user',
          content: JSON.stringify(body),
        },
      ],
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Groq refine error ${res.status}: ${raw}`);
  }

  const parsed = JSON.parse(raw);
  const content = parsed?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    throw new Error('Groq refine content missing');
  }

  const jsonObj = extractJsonObject(content);
  const normalized = normalizeGoalRefinement(jsonObj);

  if (!normalized) {
    throw new Error(`Invalid goal refinement JSON: ${content}`);
  }

  return normalized;
}

async function callGroqPlanner(env: Env, body: PlannerRequest): Promise<PlannerBundle> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.45,
      max_completion_tokens: 1400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: buildPlannerPrompt(),
        },
        {
          role: 'user',
          content: JSON.stringify({
            goal: topGoal(body.goals),
            goals: body.goals.map((g) => g.title),
            answers: body.answers ?? {},
            signals: body.signals,
            profile: body.profile,
            userPlanningProfile: body.userPlanningProfile ?? null,
            freeSlots: body.freeSlots ?? [],
          }),
        },
      ],
    }),
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new Error(`Groq planner error ${res.status}: ${raw}`);
  }

  const parsed = JSON.parse(raw);
  const content = parsed?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    throw new Error('Groq planner content missing');
  }

  const jsonObj = extractJsonObject(content);
  const normalized = normalizePlannerBundle(jsonObj);

  if (!normalized) {
    throw new Error(`Invalid planner JSON: ${content}`);
  }

  return normalized;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return json({}, { status: 200 });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true }, { status: 200 });
    }

    if (request.method === 'POST' && url.pathname === '/goal/refine') {
      let body: GoalRefineRequest;

      try {
        body = (await request.json()) as GoalRefineRequest;
      } catch (error) {
        return json(
          {
            error: 'Invalid request body',
            details: error instanceof Error ? error.message : 'unknown',
          },
          { status: 400 }
        );
      }

      try {
        const result = await callGroqGoalRefinement(env, body);
        return json(result, { status: 200 });
      } catch (error) {
        console.log('Groq goal refinement failed, using fallback:', error);
        return json(buildFallbackGoalRefinement(body), { status: 200 });
      }
    }

    if (request.method === 'POST' && url.pathname === '/planner/suggest') {
      let body: PlannerRequest;

      try {
        body = (await request.json()) as PlannerRequest;
      } catch (error) {
        return json(
          {
            error: 'Invalid request body',
            details: error instanceof Error ? error.message : 'unknown',
          },
          { status: 400 }
        );
      }

      try {
        const result = await callGroqPlanner(env, body);
        return json(result, { status: 200 });
      } catch (error) {
        console.log('Groq planner failed, using fallback:', error);
        return json(buildFallbackPlanner(body), { status: 200 });
      }
    }

    return json({ error: 'Not found' }, { status: 404 });
  },
};