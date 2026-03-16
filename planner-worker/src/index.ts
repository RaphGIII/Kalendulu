import {
  generateMasterBlueprint,
  type Domain,
  type GoalStateSignal,
  type MasterBlueprintOutput,
} from './coachEngine';

export interface Env {
  GROQ_API_KEY: string;
  APP_SHARED_SECRET?: string;
  GROQ_MODEL_REFINE?: string;
  GROQ_MODEL_PLAN?: string;
}

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
  goalType:
    | 'fitness'
    | 'study'
    | 'language'
    | 'career'
    | 'business'
    | 'mindset'
    | 'research'
    | 'writing'
    | 'project'
    | 'other';
  questions: GoalQuestion[];
  analysis?: {
    category?: string;
    complexity?: 'simple' | 'moderate' | 'advanced' | 'high_complexity';
    difficulty?: 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
    rationale?: string[];
    missingInformation?: string[];
    recommendedQuestionCount?: number;
    targetQuestionCount?: number;
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
  };
  alternatives?: Array<{
    label: string;
    todo: PlannerReasonedText;
    habit: PlannerReasonedText;
    calendar: PlannerCalendarBlock;
  }>;
  executionSteps: PlannerExecutionStep[];
  systemMap?: {
    rootProblem: string;
    problemNodes: Array<{
      id: string;
      label: string;
      kind: string;
      severity: number;
      explanation: string;
    }>;
    dependencyEdges: Array<{
      from: string;
      to: string;
      relation: string;
      weight: number;
    }>;
    patternInsights: Array<{
      label: string;
      explanation: string;
      repetitionLikelihood: 'low' | 'medium' | 'high';
      coachingValue: 'low' | 'medium' | 'high';
    }>;
    leverageInsights: Array<{
      label: string;
      explanation: string;
      expectedImpact: 'low' | 'medium' | 'high';
      whyHighLeverage: string;
    }>;
    failureScenarios: Array<{
      label: string;
      trigger: string;
      consequence: string;
      prevention: string;
    }>;
  };
  planMeta?: {
    depth?: 'compact' | 'balanced' | 'deep' | 'full_system';
    difficulty?: 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard';
    complexity?: 'simple' | 'moderate' | 'advanced' | 'high_complexity';
    summary?: string;
    targetStepCount?: number;
    coachStyle?: string;
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
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
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

function parseModelJsonLoose<T>(rawText: string): T | null {
  try {
    return JSON.parse(stripCodeFences(rawText)) as T;
  } catch {
    const extracted = extractFirstJsonObject(rawText);
    if (!extracted) return null;
    try {
      return JSON.parse(extracted) as T;
    } catch {
      return null;
    }
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function curvedCount(level: number, min: number, max: number) {
  const safe = clamp(level, 1, 10);
  const t = (safe - 1) / 9;
  const curved = (Math.exp(2.4 * t) - 1) / (Math.exp(2.4) - 1);
  return Math.round(min + curved * (max - min));
}

function questionCountForDifficulty(level: number) {
  return curvedCount(level, 5, 40);
}

function stepCountForDifficulty(level: number) {
  return curvedCount(level, 10, 50);
}

function inferGoalType(goal: string): GoalRefinementResponse['goalType'] {
  const g = goal.toLowerCase();

  if (
    g.includes('abnehm') ||
    g.includes('fett') ||
    g.includes('muskel') ||
    g.includes('fitness') ||
    g.includes('lauf') ||
    g.includes('gesund') ||
    g.includes('zunehmen')
  ) {
    return 'fitness';
  }

  if (g.includes('doktor') || g.includes('master') || g.includes('stud') || g.includes('prüfung')) {
    return 'study';
  }

  if (g.includes('paper') || g.includes('forschung') || g.includes('dissertation')) {
    return 'research';
  }

  if (g.includes('buch') || g.includes('schreib') || g.includes('roman')) {
    return 'writing';
  }

  if (g.includes('unternehmen') || g.includes('startup') || g.includes('firma')) {
    return 'business';
  }

  if (g.includes('karriere') || g.includes('bewerb') || g.includes('job')) {
    return 'career';
  }

  if (g.includes('sprache') || g.includes('englisch') || g.includes('deutsch')) {
    return 'language';
  }

  if (g.includes('projekt') || g.includes('app') || g.includes('produkt')) {
    return 'project';
  }

  return 'other';
}

function inferDomain(goal: string): Domain {
  const g = goal.toLowerCase();

  if (g.includes('schach') || g.includes('elo')) return 'chess';
  if (
    g.includes('mondscheinsonate') ||
    g.includes('klavier') ||
    g.includes('gitarre') ||
    g.includes('beethoven') ||
    g.includes('musik')
  ) {
    return 'music';
  }
  if (
    g.includes('abnehm') ||
    g.includes('fett') ||
    g.includes('muskel') ||
    g.includes('fitness') ||
    g.includes('lauf') ||
    g.includes('zunehmen')
  ) {
    return 'fitness';
  }
  if (
    g.includes('doktor') ||
    g.includes('master') ||
    g.includes('stud') ||
    g.includes('prüfung') ||
    g.includes('lernen')
  ) {
    return 'study';
  }
  if (
    g.includes('unternehmen') ||
    g.includes('startup') ||
    g.includes('firma') ||
    g.includes('business')
  ) {
    return 'business';
  }
  if (g.includes('schreib') || g.includes('roman') || g.includes('buch')) {
    return 'writing';
  }
  if (g.includes('projekt') || g.includes('app') || g.includes('produkt')) {
    return 'project';
  }
  return 'other';
}

function buildDomainRequirements(goalType: GoalRefinementResponse['goalType']) {
  switch (goalType) {
    case 'fitness':
      return [
        'Pflicht bei Körperzielen: aktueller Stand, Zielstand, verfügbare Zeit, Trainingshistorie, gesundheitliche Grenzen, Engpässe.',
        'Wenn das Ziel Abnehmen oder Zunehmen ist, müssen später konkrete Kalorien-, Protein-, Trainings- und Kontrollparameter ableitbar sein.',
      ];
    case 'research':
      return [
        'Pflicht bei Forschung/Promotion: Fachgebiet, Status quo, Thema, institutionelle Vorgaben, Deadline, Daten/Literatur, Betreuerstatus, Wochenstunden, Kapitelstatus.',
      ];
    case 'business':
      return [
        'Pflicht bei Unternehmensaufbau: Branche, Angebot, Startstatus, Budget, verfügbare Stunden, Vertriebsweg, Zielgruppe, monetäres Ziel.',
      ];
    case 'writing':
      return [
        'Pflicht bei Schreibzielen: Format, Umfang, Deadline, vorhandenes Material, Schreibstatus, verfügbare Schreibblöcke, Qualitätsanspruch.',
      ];
    case 'study':
      return [
        'Pflicht bei Lern-/Schach-/Leistungszielen: aktueller Stand, Zielniveau, Wochenstunden, Hauptfehlerquellen, Trainingshistorie, Messkriterien.',
      ];
    default:
      return [
        'Fragen müssen Outcome, Ausgangslage, Zeitrahmen, verfügbare Zeit, Ressourcen, Hindernisse, Messkriterium und realistische Umsetzung klären.',
      ];
  }
}

function refinementSystemPrompt(targetQuestionCount: number, goalType: string) {
  return `
Du bist die Diagnose- und Coaching-KI für Kalendulu.
Antworte NUR mit gültigem JSON.

AUFGABE:
- Analysiere das Ziel.
- Erstelle GENAU ${targetQuestionCount} Fragen auf Deutsch.
- Die Fragen müssen tief genug sein, damit danach ein hochpräziser Blueprint mit Problembaum, Mustererkennung, Hebeln, Failure Modes und milestone-basiertem Plan erzeugt werden kann.
- Schwierige Ziele brauchen deutlich tiefere Diagnostik.
- Die Fragen müssen nach Relevanz priorisiert sein.
- Nutze Fragearten: text, long_text, single_choice, multi_choice.

COACHING-HALTUNG:
- Denke wie ein fordernder Elite-Coach.
- Gehe davon aus, dass der Benutzer extrem anspruchsvoll und perfektionistisch ist.
- Lieber analytisch, präzise und leicht zu hart als banal oder weich.
- Jede Frage soll helfen, Hauptproblem, Unterprobleme, Muster, Mikroskills, Engpässe oder Failure Modes sichtbar zu machen.

DOMÄNENREGELN:
${buildDomainRequirements(goalType as any).join('\n')}

JSON-SHAPE:
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
    "recommendedQuestionCount": ${targetQuestionCount},
    "targetQuestionCount": ${targetQuestionCount}
  }
}
`.trim();
}

function scoreLabel(value: number): 'low' | 'medium' | 'high' {
  if (value >= 0.76) return 'high';
  if (value >= 0.42) return 'medium';
  return 'low';
}

function buildNextCalendarWindow(targetDateIso: string) {
  const now = new Date();
  const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  start.setHours(18, 0, 0, 0);

  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const target = new Date(targetDateIso);
  if (Number.isFinite(target.getTime()) && end.getTime() > target.getTime()) {
    const adjustedStart = new Date(target.getTime() - 60 * 60 * 1000);
    return {
      start: adjustedStart.toISOString(),
      end: target.toISOString(),
    };
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function buildRoutineBlocks(frequencyPerWeek: number, durationMinutes: number) {
  const count = clamp(frequencyPerWeek, 1, 5);
  const blocks: PlannerRoutineBlock[] = [];
  const base = new Date();
  base.setHours(19, 0, 0, 0);

  for (let i = 0; i < count; i += 1) {
    const start = new Date(base.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    blocks.push({
      title: `Routine Block ${i + 1}`,
      start: start.toISOString(),
      end: end.toISOString(),
    });
  }

  return blocks;
}

function convertBlueprintToBundle(
  blueprint: MasterBlueprintOutput,
  goal: string,
  targetDateIso: string,
  targetStepCount: number,
): PlannerBundle {
  const nextCalendar = buildNextCalendarWindow(targetDateIso);

  const mainStep = blueprint.executionSteps[0];
  const mainRoutine = blueprint.routines[0];

  const todoTitle =
    mainStep?.title ||
    'Nächste Hauptphase starten';

  const habitTitle =
    mainRoutine?.title ||
    'Wiederkehrenden Fokusblock halten';

  const systemMap = {
    rootProblem: blueprint.rootProblem,
    problemNodes: blueprint.graph.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      severity: node.severity,
      explanation: node.description,
    })),
    dependencyEdges: blueprint.graph.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      relation: edge.relation,
      weight: edge.weight,
    })),
    patternInsights: blueprint.patternInsights.map((pattern) => ({
      label: pattern.label,
      explanation: pattern.explanation,
      repetitionLikelihood: scoreLabel(pattern.repetitionLikelihood),
      coachingValue: scoreLabel(pattern.coachingValue),
    })),
    leverageInsights: blueprint.leverageInsights.map((lev) => ({
      label: lev.label,
      explanation: lev.explanation,
      expectedImpact: scoreLabel(lev.expectedImpact),
      whyHighLeverage: `Urgency ${lev.urgency.toFixed(2)} · Compounding ${lev.compoundingValue.toFixed(2)} · Difficulty ${lev.difficulty.toFixed(2)}`,
    })),
    failureScenarios: blueprint.failureScenarios.map((failure) => ({
      label: failure.label,
      trigger: failure.triggerNodeIds.join(', ') || 'unbekannt',
      consequence: failure.consequenceNodeIds.join(', ') || 'unbekannt',
      prevention: failure.preventionActionHints.join(' · '),
    })),
  };

  const routines: PlannerRoutine[] = blueprint.routines.map((routine) => ({
    title: routine.title,
    reason: routine.reason,
    instruction: routine.reason,
    frequencyPerWeek: routine.frequencyPerWeek,
    durationMinutes: routine.durationMinutes,
    reviewAfterDays: 7,
    blocks: buildRoutineBlocks(routine.frequencyPerWeek, routine.durationMinutes),
  }));

  const executionSteps: PlannerExecutionStep[] = blueprint.executionSteps
    .slice(0, targetStepCount)
    .map((step, index) => ({
      id: step.id || `step_${index + 1}`,
      order: index + 1,
      title: step.title,
      explanation: step.explanation,
      whyItMatters: step.whyItMatters,
      estimatedDays: step.estimatedDays,
      checklist: step.checklist.map((item, itemIndex) => ({
        id: item.id || `c_${index + 1}_${itemIndex + 1}`,
        label: item.label,
        done: false,
      })),
      linkedTodoTitles: [todoTitle],
      linkedHabitTitles: [habitTitle],
    }));

  while (executionSteps.length < targetStepCount) {
    const i = executionSteps.length;
    executionSteps.push({
      id: `step_${i + 1}`,
      order: i + 1,
      title: `Fortschrittsphase ${i + 1}`,
      explanation: 'Zusätzliche strukturierte Fortschrittsphase zur Vervollständigung des Zielpfads.',
      whyItMatters: 'Das Ziel soll vollständig in belastbare Phasen zerlegt bleiben.',
      estimatedDays: 4,
      checklist: [
        {
          id: `c_${i + 1}_1`,
          label: 'Phase klar ausführen',
          done: false,
        },
        {
          id: `c_${i + 1}_2`,
          label: 'Zwischenergebnis sichern',
          done: false,
        },
      ],
      linkedTodoTitles: [todoTitle],
      linkedHabitTitles: [habitTitle],
    });
  }

  return {
    primary: {
      todo: {
        title: todoTitle,
        reason:
          blueprint.rootProblem ||
          `Hauptengpass für "${goal}" muss zuerst sauber angegangen werden.`,
        instruction:
          mainStep?.explanation ||
          'Starte mit der Phase, die den größten Downstream-Hebel hat.',
        expectedEffect:
          'Die Hauptengstelle wird reduziert und spätere Phasen werden leichter.',
      },
      habit: {
        title: habitTitle,
        reason:
          mainRoutine?.reason ||
          'Ein stabiles wiederkehrendes System trägt die milestone-basierten Phasen.',
        instruction:
          mainRoutine?.reason ||
          'Wiederhole den Kernblock konsequent und messbar.',
        expectedEffect:
          'Mehr Konstanz und weniger Zerfall zwischen den Phasen.',
      },
      calendar: {
        title: mainStep?.title || 'Fokusblock',
        start: nextCalendar.start,
        end: nextCalendar.end,
        reason:
          'Der wichtigste Hebel braucht einen realen Zeitslot statt nur Absicht.',
        instruction:
          mainStep?.explanation ||
          'Arbeite in diesem Block nur an der aktuell wichtigsten Phase.',
      },
      routines,
    },
    alternatives: [],
    executionSteps,
    systemMap,
    planMeta: {
      depth: blueprint.executionSteps.length >= 30 ? 'full_system' : blueprint.executionSteps.length >= 20 ? 'deep' : 'balanced',
      difficulty:
        blueprint.scoreBreakdown.totalScore >= 28
          ? 'hard'
          : blueprint.scoreBreakdown.totalScore >= 18
            ? 'medium'
            : 'easy',
      complexity:
        blueprint.graph.nodes.length >= 10
          ? 'high_complexity'
          : blueprint.graph.nodes.length >= 7
            ? 'advanced'
            : 'moderate',
      summary: `Blueprint für "${goal}" mit Root Problem, Musterstruktur, Hebeln, Failure Modes und ${targetStepCount} Fortschrittsphasen.`,
      targetStepCount,
      coachStyle: 'elite_demanding_precision_problem_tree',
    },
  };
}

function plannerSystemPrompt(targetStepCount: number, blueprintBundle: PlannerBundle) {
  return `
Language: German.
Role: You are the elite execution coach for Kalendulu.
Return ONLY valid JSON.

HARD RULES:
1. Output EXACTLY ${targetStepCount} executionSteps.
2. executionSteps are milestone-like phases, not trivial habits.
3. Keep the deep structure from the provided blueprint.
4. Preserve the root problem, leverage orientation, and failure-awareness.
5. Do not soften the plan.
6. Prefer precision, causal structure and demanding realism over generic advice.
7. Routines belong in routines, not as shallow standalone steps.
8. The user is highly demanding and perfectionistic.

YOU MUST IMPROVE THIS BLUEPRINT, NOT REPLACE IT WITH GENERIC ADVICE:
${JSON.stringify(blueprintBundle)}

JSON SHAPE:
{
  "primary": {
    "todo": { "title": "string", "reason": "string", "instruction": "string optional", "expectedEffect": "string optional" },
    "habit": { "title": "string", "reason": "string", "instruction": "string optional", "expectedEffect": "string optional" },
    "calendar": { "title": "string", "start": "ISO string", "end": "ISO string", "reason": "string", "instruction": "string optional" },
    "routines": [
      {
        "title": "string",
        "reason": "string",
        "instruction": "string optional",
        "frequencyPerWeek": 3,
        "durationMinutes": 30,
        "blocks": [
          { "title": "string", "start": "ISO string", "end": "ISO string" }
        ]
      }
    ]
  },
  "alternatives": [],
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
  "systemMap": {
    "rootProblem": "string",
    "problemNodes": [],
    "dependencyEdges": [],
    "patternInsights": [],
    "leverageInsights": [],
    "failureScenarios": []
  },
  "planMeta": {
    "depth": "compact|balanced|deep|full_system",
    "difficulty": "very_easy|easy|medium|hard|very_hard",
    "complexity": "simple|moderate|advanced|high_complexity",
    "summary": "string",
    "targetStepCount": ${targetStepCount},
    "coachStyle": "elite_demanding_precision_problem_tree"
  }
}
`.trim();
}

async function callGroqRaw(params: {
  env: Env;
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxCompletionTokens?: number;
  forceJson?: boolean;
}) {
  const body: Record<string, unknown> = {
    model: params.model,
    temperature: params.temperature ?? 0.2,
    max_completion_tokens: params.maxCompletionTokens ?? 3800,
    messages: [
      { role: 'system', content: params.system },
      { role: 'user', content: params.user },
    ],
  };

  if (params.forceJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.env.GROQ_API_KEY}`,
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

function buildFallbackRefinement(goal: string, difficultyLevel: number): GoalRefinementResponse {
  const count = questionCountForDifficulty(difficultyLevel);
  const goalType = inferGoalType(goal);

  const baseQuestions: GoalQuestion[] = [
    {
      id: 'target_outcome',
      title: 'Was genau willst du konkret erreichen?',
      type: 'long_text',
      required: true,
      section: 'Ziel',
      whyAsked: 'Ohne exakt definiertes Endergebnis kann kein präziser Blueprint gebaut werden.',
      priority: 10,
      placeholder: 'Beschreibe das Ziel messbar und konkret.',
    },
    {
      id: 'starting_point',
      title: 'Wo stehst du aktuell genau in Bezug auf dieses Ziel?',
      type: 'long_text',
      required: true,
      section: 'Ausgangslage',
      whyAsked: 'Der Plan hängt stark vom echten Startpunkt ab.',
      priority: 10,
      placeholder: 'Beschreibe deinen Ist-Zustand.',
    },
    {
      id: 'deadline',
      title: 'Bis wann willst du das Ziel erreichen?',
      type: 'text',
      required: true,
      section: 'Zeitrahmen',
      whyAsked: 'Tempo, Phasen und Belastung hängen von der Deadline ab.',
      priority: 9,
      placeholder: 'z. B. 2026-10-31',
    },
    {
      id: 'weekly_time',
      title: 'Wie viele Stunden pro Woche kannst du realistisch investieren?',
      type: 'text',
      required: true,
      section: 'Ressourcen',
      whyAsked: 'Das System muss auf echter verfügbarer Zeit basieren.',
      priority: 9,
      placeholder: 'z. B. 8',
    },
    {
      id: 'root_bottleneck_guess',
      title: 'Was ist dein größtes Hindernis oder dein größter Engpass?',
      type: 'long_text',
      required: true,
      section: 'Engpass',
      whyAsked: 'Ein guter Coach beginnt mit dem wahrscheinlich größten Downstream-Problem.',
      priority: 8,
      placeholder: 'z. B. Technik, Zeitmangel, Fokus, fehlende Struktur, fehlendes Wissen',
    },
  ];

  while (baseQuestions.length < count) {
    const index = baseQuestions.length + 1;
    baseQuestions.push({
      id: `extra_${index}`,
      title: `Zusatzfrage ${index}: Welche Detailinformation fehlt noch, damit das Ziel als Problembaum modelliert werden kann?`,
      type: 'text',
      required: true,
      section: 'Vertiefung',
      whyAsked: 'Komplexe Ziele brauchen Präzision auf Unterproblem-Ebene.',
      priority: Math.max(1, 10 - index),
      placeholder: 'Kurze, konkrete Antwort',
    });
  }

  return {
    goalLabel: goal || 'Neues Ziel',
    goalType,
    questions: baseQuestions.slice(0, count),
    analysis: {
      category: goalType,
      complexity: difficultyLevel >= 8 ? 'high_complexity' : difficultyLevel >= 5 ? 'advanced' : 'moderate',
      difficulty:
        difficultyLevel >= 9 ? 'very_hard' :
        difficultyLevel >= 7 ? 'hard' :
        difficultyLevel >= 4 ? 'medium' : 'easy',
      rationale: ['Fallback-Fragenset wurde erzeugt, weil das Modell keine saubere JSON-Antwort geliefert hat.'],
      missingInformation: ['Weitere Mikrodetails werden in der nächsten Planungsstufe modelliert.'],
      recommendedQuestionCount: count,
      targetQuestionCount: count,
    },
  };
}

function extractWeeklyHours(body: Record<string, unknown>) {
  const direct = safeNumber(body.weeklyHours, NaN);
  if (Number.isFinite(direct)) return clamp(direct, 1, 40);

  const answers = body.answers as Record<string, unknown> | undefined;
  if (answers) {
    const fromWeeklyHours = Number(answers.weekly_hours);
    if (Number.isFinite(fromWeeklyHours)) return clamp(fromWeeklyHours, 1, 40);

    const fromMinutesPerDay = Number(answers.minutes_per_day);
    const fromDaysPerWeek = Number(answers.days_per_week);
    if (Number.isFinite(fromMinutesPerDay) && Number.isFinite(fromDaysPerWeek)) {
      return clamp((fromMinutesPerDay * fromDaysPerWeek) / 60, 1, 40);
    }
  }

  return 8;
}

function buildSignalsFromBody(body: Record<string, unknown>) {
  const signals: GoalStateSignal[] = [];

  const answers = (body.answers ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(answers)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      signals.push({
        key,
        value,
        confidence: 0.85,
      });
    } else if (Array.isArray(value)) {
      signals.push({
        key,
        value: value.join(', '),
        confidence: 0.75,
      });
    }
  }

  const profile = (body.profile ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(profile)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      signals.push({
        key: `profile_${key}`,
        value,
        confidence: 0.75,
      });
    }
  }

  const userPlanningProfile = (body.userPlanningProfile ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(userPlanningProfile)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      signals.push({
        key: `planning_${key}`,
        value,
        confidence: 0.72,
      });
    }
  }

  return signals;
}

function normalizePlannerBundle(
  bundle: PlannerBundle,
  targetStepCount: number,
): PlannerBundle {
  const normalizedSteps = ensureArray<PlannerExecutionStep>(bundle.executionSteps)
    .slice(0, targetStepCount)
    .map((step, index) => ({
      id: step.id || `step_${index + 1}`,
      order: index + 1,
      title: step.title,
      explanation: step.explanation,
      whyItMatters: step.whyItMatters,
      estimatedDays: step.estimatedDays,
      checklist: ensureArray<PlannerExecutionChecklistItem>(step.checklist)
        .slice(0, 4)
        .map((item, itemIndex) => ({
          id: item.id || `c_${index + 1}_${itemIndex + 1}`,
          label: item.label,
          done: false,
        })),
      linkedTodoTitles: ensureArray<string>(step.linkedTodoTitles),
      linkedHabitTitles: ensureArray<string>(step.linkedHabitTitles),
    }));

  while (normalizedSteps.length < targetStepCount) {
    const index = normalizedSteps.length;
    normalizedSteps.push({
      id: `step_${index + 1}`,
      order: index + 1,
      title: `Fortschrittsphase ${index + 1}`,
      explanation:
        'Zusätzliche klare Umsetzungsphase zur vollständigen Zielkette.',
      whyItMatters:
        'Das Ziel soll in belastbare Phasen statt in weiche Tipps zerlegt bleiben.',
      estimatedDays: 4,
      checklist: [
        { id: `c_${index + 1}_1`, label: 'Kernaufgabe der Phase durchführen', done: false },
        { id: `c_${index + 1}_2`, label: 'Zwischenergebnis sichern', done: false },
      ],
      linkedTodoTitles: [bundle.primary.todo.title],
      linkedHabitTitles: [bundle.primary.habit.title],
    });
  }

  return {
    ...bundle,
    executionSteps: normalizedSteps,
  };
}

function validateSecret(request: Request, env: Env) {
  if (!env.APP_SHARED_SECRET) return true;
  const headerSecret = request.headers.get('X-App-Secret');
  return headerSecret === env.APP_SHARED_SECRET;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return jsonResponse({ ok: true });
    }

    if (!validateSecret(request, env)) {
      return errorResponse('Unauthorized', 401);
    }

    const url = new URL(request.url);

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return jsonResponse({ ok: true });
      }

      if (request.method !== 'POST') {
        return errorResponse('Method not allowed', 405);
      }

      const body = (await request.json()) as Record<string, unknown>;

      if (url.pathname === '/goal/refine') {
        const goal = safeString(body.goal).trim();
        const difficultyLevel = clamp(safeNumber(body.difficultyLevel, 5), 1, 10);
        const targetQuestionCount = questionCountForDifficulty(difficultyLevel);
        const goalType = inferGoalType(goal);

        if (!goal) {
          return errorResponse('Goal is required.', 400);
        }

        const system = refinementSystemPrompt(targetQuestionCount, goalType);
        const user = JSON.stringify({
          goal,
          difficultyLevel,
          targetQuestionCount,
          targetDate: safeString(body.targetDate),
          pastGoals: ensureArray(body.pastGoals),
          profile: body.profile ?? {},
          existingAnswers: body.existingAnswers ?? {},
        });

        try {
          const raw = await callGroqRaw({
            env,
            model: env.GROQ_MODEL_REFINE || 'llama-3.3-70b-versatile',
            system,
            user,
            temperature: 0.15,
            maxCompletionTokens: 3000,
            forceJson: true,
          });

          const parsed = parseModelJsonLoose<GoalRefinementResponse>(raw);

          if (!parsed || !Array.isArray(parsed.questions) || !parsed.questions.length) {
            return jsonResponse(buildFallbackRefinement(goal, difficultyLevel));
          }

          const normalized: GoalRefinementResponse = {
            goalLabel: parsed.goalLabel || goal,
            goalType: parsed.goalType || goalType,
            questions: parsed.questions.slice(0, targetQuestionCount),
            analysis: {
              category: parsed.analysis?.category || goalType,
              complexity:
                parsed.analysis?.complexity ||
                (difficultyLevel >= 8 ? 'high_complexity' : difficultyLevel >= 5 ? 'advanced' : 'moderate'),
              difficulty:
                parsed.analysis?.difficulty ||
                (difficultyLevel >= 9 ? 'very_hard' : difficultyLevel >= 7 ? 'hard' : difficultyLevel >= 4 ? 'medium' : 'easy'),
              rationale: ensureArray<string>(parsed.analysis?.rationale),
              missingInformation: ensureArray<string>(parsed.analysis?.missingInformation),
              recommendedQuestionCount: targetQuestionCount,
              targetQuestionCount,
            },
          };

          return jsonResponse(normalized);
        } catch {
          return jsonResponse(buildFallbackRefinement(goal, difficultyLevel));
        }
      }

      if (url.pathname === '/planner/suggest') {
        const goal = safeString(body.goal).trim();
        const difficultyLevel = clamp(safeNumber(body.difficultyLevel, 5), 1, 10);
        const targetStepCount = stepCountForDifficulty(difficultyLevel);
        const targetDate = safeString(body.targetDate) || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

        if (!goal) {
          return errorResponse('Goal is required.', 400);
        }

        const domain = inferDomain(goal);
        const weeklyHours = extractWeeklyHours(body);
        const signals = buildSignalsFromBody(body);

        const blueprint = generateMasterBlueprint({
          goalTitle: goal,
          domain,
          targetDateIso: targetDate,
          difficultyLevel,
          weeklyHours,
          signals,
          userStyle: {
            ambition: 0.88,
            perfectionism: 0.92,
            pressureTolerance: 0.76,
            consistency: 0.62,
          },
        });

        const deterministicBundle = convertBlueprintToBundle(
          blueprint,
          goal,
          targetDate,
          targetStepCount,
        );

        try {
          const system = plannerSystemPrompt(targetStepCount, deterministicBundle);
          const user = JSON.stringify({
            goal,
            difficultyLevel,
            targetStepCount,
            targetDate,
            profile: body.profile ?? {},
            signals: body.signals ?? {},
            freeSlots: body.freeSlots ?? [],
            answers: body.answers ?? {},
            userPlanningProfile: body.userPlanningProfile ?? {},
            pastGoals: body.goals ?? [],
            deterministicBlueprint: deterministicBundle,
          });

          const raw = await callGroqRaw({
            env,
            model: env.GROQ_MODEL_PLAN || 'llama-3.3-70b-versatile',
            system,
            user,
            temperature: 0.1,
            maxCompletionTokens: 4200,
            forceJson: true,
          });

          const parsed = parseModelJsonLoose<PlannerBundle>(raw);

          if (!parsed || !parsed.primary || !Array.isArray(parsed.executionSteps)) {
            return jsonResponse(deterministicBundle);
          }

          const merged: PlannerBundle = {
            primary: {
              todo: parsed.primary.todo ?? deterministicBundle.primary.todo,
              habit: parsed.primary.habit ?? deterministicBundle.primary.habit,
              calendar: parsed.primary.calendar ?? deterministicBundle.primary.calendar,
              routines: ensureArray<PlannerRoutine>(parsed.primary.routines).length
                ? ensureArray<PlannerRoutine>(parsed.primary.routines)
                : deterministicBundle.primary.routines,
            },
            alternatives: [],
            executionSteps: parsed.executionSteps,
            systemMap: parsed.systemMap ?? deterministicBundle.systemMap,
            planMeta: {
              depth:
                parsed.planMeta?.depth ??
                deterministicBundle.planMeta?.depth,
              difficulty:
                parsed.planMeta?.difficulty ??
                deterministicBundle.planMeta?.difficulty,
              complexity:
                parsed.planMeta?.complexity ??
                deterministicBundle.planMeta?.complexity,
              summary:
                parsed.planMeta?.summary ??
                deterministicBundle.planMeta?.summary,
              targetStepCount,
              coachStyle:
                parsed.planMeta?.coachStyle ??
                deterministicBundle.planMeta?.coachStyle,
            },
          };

          return jsonResponse(normalizePlannerBundle(merged, targetStepCount));
        } catch {
          return jsonResponse(deterministicBundle);
        }
      }

      return errorResponse('Not found', 404);
    } catch (error: any) {
      return errorResponse(error?.message ?? 'Unknown error', 500);
    }
  },
};