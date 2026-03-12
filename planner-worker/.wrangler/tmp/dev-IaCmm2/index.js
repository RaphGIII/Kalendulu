var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
function json(data, init) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
      ...init?.headers ?? {}
    }
  });
}
__name(json, "json");
function topGoal(goals) {
  return goals[0]?.title?.trim() || "Ein pers\xF6nliches Ziel";
}
__name(topGoal, "topGoal");
function extractJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
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
__name(extractJsonObject, "extractJsonObject");
function normalizeGoalRefinement(data) {
  if (!data || typeof data !== "object") return null;
  if (typeof data.goalLabel !== "string") return null;
  if (typeof data.goalType !== "string") return null;
  if (!Array.isArray(data.questions)) return null;
  const questions = data.questions.filter(
    (q) => q && typeof q.id === "string" && typeof q.title === "string" && (q.type === "text" || q.type === "single_choice" || q.type === "multi_choice") && typeof q.required === "boolean"
  ).map((q) => ({
    id: q.id.trim(),
    title: q.title.trim(),
    type: q.type,
    required: q.required,
    options: Array.isArray(q.options) ? q.options.filter((o) => o && typeof o.id === "string" && typeof o.label === "string").map((o) => ({
      id: o.id.trim(),
      label: o.label.trim()
    })).slice(0, 10) : void 0,
    placeholder: typeof q.placeholder === "string" ? q.placeholder.trim() : void 0
  })).slice(0, 10);
  if (!questions.length) return null;
  return {
    goalLabel: data.goalLabel.trim(),
    goalType: data.goalType.trim(),
    questions
  };
}
__name(normalizeGoalRefinement, "normalizeGoalRefinement");
function normalizePlannerBundle(data) {
  if (!data || typeof data !== "object") return null;
  if (!data.primary || typeof data.primary !== "object") return null;
  if (!Array.isArray(data.alternatives)) return null;
  const validText = /* @__PURE__ */ __name((x) => x && typeof x.title === "string" && typeof x.reason === "string", "validText");
  const validCalendar = /* @__PURE__ */ __name((x) => x && typeof x.title === "string" && typeof x.start === "string" && typeof x.end === "string" && typeof x.reason === "string", "validCalendar");
  const primary = data.primary;
  if (!validText(primary.todo)) return null;
  if (!validText(primary.habit)) return null;
  if (!validCalendar(primary.calendar)) return null;
  const routines = Array.isArray(primary.routines) ? primary.routines.filter(
    (r) => r && typeof r.title === "string" && typeof r.reason === "string" && typeof r.frequencyPerWeek === "number" && Array.isArray(r.blocks)
  ).map((r) => ({
    title: r.title.trim(),
    reason: r.reason.trim(),
    instruction: typeof r.instruction === "string" ? r.instruction.trim() : void 0,
    frequencyPerWeek: r.frequencyPerWeek,
    durationMinutes: typeof r.durationMinutes === "number" ? r.durationMinutes : void 0,
    reviewAfterDays: typeof r.reviewAfterDays === "number" ? r.reviewAfterDays : void 0,
    blocks: r.blocks.filter(
      (b) => b && typeof b.title === "string" && typeof b.start === "string" && typeof b.end === "string"
    ).map((b) => ({
      title: b.title.trim(),
      start: b.start,
      end: b.end
    }))
  })).filter((r) => r.blocks.length > 0).slice(0, 2) : [];
  const alternatives = data.alternatives.filter(
    (a) => a && typeof a.label === "string" && validText(a.todo) && validText(a.habit) && validCalendar(a.calendar)
  ).map((a) => ({
    label: a.label.trim(),
    todo: {
      title: a.todo.title.trim(),
      reason: a.todo.reason.trim(),
      instruction: typeof a.todo.instruction === "string" ? a.todo.instruction.trim() : void 0,
      expectedEffect: typeof a.todo.expectedEffect === "string" ? a.todo.expectedEffect.trim() : void 0
    },
    habit: {
      title: a.habit.title.trim(),
      reason: a.habit.reason.trim(),
      instruction: typeof a.habit.instruction === "string" ? a.habit.instruction.trim() : void 0,
      expectedEffect: typeof a.habit.expectedEffect === "string" ? a.habit.expectedEffect.trim() : void 0
    },
    calendar: {
      title: a.calendar.title.trim(),
      start: a.calendar.start,
      end: a.calendar.end,
      reason: a.calendar.reason.trim(),
      instruction: typeof a.calendar.instruction === "string" ? a.calendar.instruction.trim() : void 0
    }
  })).slice(0, 3);
  return {
    primary: {
      todo: {
        title: primary.todo.title.trim(),
        reason: primary.todo.reason.trim(),
        instruction: typeof primary.todo.instruction === "string" ? primary.todo.instruction.trim() : void 0,
        expectedEffect: typeof primary.todo.expectedEffect === "string" ? primary.todo.expectedEffect.trim() : void 0
      },
      habit: {
        title: primary.habit.title.trim(),
        reason: primary.habit.reason.trim(),
        instruction: typeof primary.habit.instruction === "string" ? primary.habit.instruction.trim() : void 0,
        expectedEffect: typeof primary.habit.expectedEffect === "string" ? primary.habit.expectedEffect.trim() : void 0
      },
      calendar: {
        title: primary.calendar.title.trim(),
        start: primary.calendar.start,
        end: primary.calendar.end,
        reason: primary.calendar.reason.trim(),
        instruction: typeof primary.calendar.instruction === "string" ? primary.calendar.instruction.trim() : void 0
      },
      routines,
      scheduleAdjustment: validText(primary.scheduleAdjustment) ? {
        title: primary.scheduleAdjustment.title.trim(),
        reason: primary.scheduleAdjustment.reason.trim(),
        instruction: typeof primary.scheduleAdjustment.instruction === "string" ? primary.scheduleAdjustment.instruction.trim() : void 0,
        expectedEffect: typeof primary.scheduleAdjustment.expectedEffect === "string" ? primary.scheduleAdjustment.expectedEffect.trim() : void 0
      } : void 0,
      review: primary.review && typeof primary.review.reviewAfterDays === "number" && Array.isArray(primary.review.questions) ? {
        reviewAfterDays: primary.review.reviewAfterDays,
        questions: primary.review.questions.filter((q) => typeof q === "string").slice(0, 5)
      } : void 0
    },
    alternatives
  };
}
__name(normalizePlannerBundle, "normalizePlannerBundle");
function buildFallbackGoalRefinement(body) {
  const goal = body.goal?.trim() || "Dein Ziel";
  return {
    goalLabel: goal,
    goalType: "generic",
    questions: [
      {
        id: "meaning",
        title: "Was meinst du mit diesem Ziel ganz konkret?",
        type: "text",
        required: true,
        placeholder: "Beschreibe das Ziel in deinen eigenen Worten"
      },
      {
        id: "reason",
        title: "Warum ist dir dieses Ziel gerade wichtig?",
        type: "text",
        required: true,
        placeholder: "Was soll sich dadurch in deinem Leben ver\xE4ndern?"
      },
      {
        id: "obstacle",
        title: "Was steht dir bisher am meisten im Weg?",
        type: "single_choice",
        required: true,
        options: [
          { id: "time", label: "Zeit" },
          { id: "energy", label: "Energie" },
          { id: "consistency", label: "Konstanz" },
          { id: "clarity", label: "Unklarheit" },
          { id: "stress", label: "Stress" }
        ]
      },
      {
        id: "intensity",
        title: "Wie willst du starten?",
        type: "single_choice",
        required: true,
        options: [
          { id: "gentle", label: "Sanft" },
          { id: "balanced", label: "Normal" },
          { id: "intense", label: "Intensiv" }
        ]
      },
      {
        id: "success",
        title: "Woran w\xFCrdest du in einigen Wochen merken, dass es funktioniert?",
        type: "text",
        required: false,
        placeholder: "Woran willst du Fortschritt erkennen?"
      },
      {
        id: "best_time",
        title: "Wann passt dieses Ziel am ehesten in dein Leben?",
        type: "single_choice",
        required: false,
        options: [
          { id: "morning", label: "Morgens" },
          { id: "afternoon", label: "Tags\xFCber" },
          { id: "evening", label: "Abends" },
          { id: "mixed", label: "Unterschiedlich" }
        ]
      }
    ]
  };
}
__name(buildFallbackGoalRefinement, "buildFallbackGoalRefinement");
function pickRoutineBlocks(freeSlots, desiredCount, blockMinutes) {
  const picked = [];
  const usedDays = /* @__PURE__ */ new Set();
  for (const slot of freeSlots) {
    if (picked.length >= desiredCount) break;
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const slotMinutes = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 6e4)
    );
    if (slotMinutes < blockMinutes) continue;
    const dayKey = slot.start.slice(0, 10);
    if (usedDays.has(dayKey)) continue;
    const blockEnd = new Date(start.getTime() + blockMinutes * 6e4);
    picked.push({
      title: "Routine",
      start: start.toISOString(),
      end: blockEnd.toISOString()
    });
    usedDays.add(dayKey);
  }
  return picked;
}
__name(pickRoutineBlocks, "pickRoutineBlocks");
function buildFallbackPlanner(body) {
  const goal = topGoal(body.goals);
  const slot = body.freeSlots?.[0];
  const start = slot?.start ?? new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString();
  const end = slot?.end ?? new Date(Date.now() + 24 * 60 * 60 * 1e3 + 30 * 60 * 1e3).toISOString();
  const routineBlocks = pickRoutineBlocks(body.freeSlots ?? [], 2, 30).map((b) => ({
    ...b,
    title: `${goal} Routine`
  }));
  return {
    primary: {
      todo: {
        title: `Setze heute eine klare Anweisung f\xFCr "${goal}" um`,
        reason: "Eine konkrete Ausf\xFChrungsanweisung ist wirksamer als ein vager Vorsatz.",
        instruction: `Lege den kleinsten realen Schritt f\xFCr "${goal}" noch heute fest und f\xFChre ihn aus.`,
        expectedEffect: "Der Einstieg wird leichter und der Widerstand sinkt."
      },
      habit: {
        title: `2 Minuten t\xE4glich f\xFCr "${goal}" reservieren`,
        reason: "Ein sehr kleines Habit erh\xF6ht die Chance auf echte Konstanz.",
        instruction: `Verkn\xFCpfe das Habit mit einem festen Ausl\xF6ser im Alltag.`,
        expectedEffect: "Wiederholung entsteht, ohne dass es \xFCberfordernd wirkt."
      },
      calendar: {
        title: goal,
        start,
        end,
        reason: "Ein fixer Slot schafft Verbindlichkeit statt nur guter Absicht.",
        instruction: "Nutze diesen Block nur f\xFCr dieses Ziel und starte ohne Ablenkung."
      },
      routines: routineBlocks.length > 0 ? [
        {
          title: `${goal} Routine`,
          reason: "Mehrere feste Wiederholungen pro Woche erh\xF6hen die Chance, dass das Ziel wirklich Teil des Alltags wird.",
          instruction: "Behandle diese Bl\xF6cke wie feste Vereinbarungen und verschiebe sie nur bewusst.",
          frequencyPerWeek: routineBlocks.length,
          durationMinutes: 30,
          reviewAfterDays: 14,
          blocks: routineBlocks
        }
      ] : [],
      scheduleAdjustment: {
        title: `Reserviere feste Wochenzeit f\xFCr "${goal}"`,
        reason: "Das Ziel wirkt wichtig genug, um mehr als spontane Restzeit zu bekommen.",
        instruction: "Plane bewusst wiederkehrende Zeit statt auf Motivation in L\xFCcken zu hoffen."
      },
      review: {
        reviewAfterDays: 7,
        questions: [
          "Hat dir dieser Plan tats\xE4chlich geholfen?",
          "War die Intensit\xE4t passend oder zu hoch?",
          "Welcher Teil hat die gr\xF6\xDFte Wirkung gezeigt?"
        ]
      }
    },
    alternatives: [
      {
        label: "Ungew\xF6hnlich",
        todo: {
          title: `Ver\xE4ndere die Umgebung f\xFCr "${goal}" statt nur deinen Willen`,
          reason: "Oft liegt der gr\xF6\xDFte Hebel nicht im Willen, sondern in der Struktur und Umgebung.",
          instruction: "Ordne deinen Alltag so um, dass die gew\xFCnschte Handlung leichter und die alte Reibung schwerer wird.",
          expectedEffect: "Weniger innere Reibung und mehr automatische Umsetzung."
        },
        habit: {
          title: `Nutze ein Mini-Ritual als Startsignal f\xFCr "${goal}"`,
          reason: "Ein Ritual senkt die mentale Einstiegsschwelle.",
          instruction: "F\xFChre immer denselben kleinen Startschritt direkt vor der eigentlichen Handlung aus.",
          expectedEffect: "Der \xDCbergang vom Denken ins Handeln wird leichter."
        },
        calendar: {
          title: `${goal} Reset`,
          start,
          end,
          reason: "Ein bewusster Startblock kann wirksamer sein als lose Motivation.",
          instruction: "Nutze diesen Termin nicht zum Perfektionismus, sondern f\xFCr einen klaren Neustart."
        }
      }
    ]
  };
}
__name(buildFallbackPlanner, "buildFallbackPlanner");
function buildGoalRefinementPrompt() {
  return [
    "Du erzeugst hochqualitative R\xFCckfragen f\xFCr eine Zielkl\xE4rungs-App.",
    "Die Fragen sollen sich an das konkrete Ziel und an das bisherige Nutzerprofil anpassen.",
    "Das Ziel ist, ein grobes Ziel in ein tiefes, pers\xF6nliches und planbares Ziel zu verwandeln.",
    "Die Fragen d\xFCrfen emotionale, praktische, identit\xE4tsbezogene und strategische Ebenen abdecken.",
    "Erstelle 6 bis 10 wirklich gute Fragen.",
    "Nutze eine Mischung aus text, single_choice und multi_choice.",
    "Die Fragen sollen klug, attraktiv und relevant wirken.",
    "Vermeide langweilige Standardfragen.",
    "Antworte ausschlie\xDFlich als JSON.",
    "Format:",
    "{",
    '  "goalLabel": "string",',
    '  "goalType": "string",',
    '  "questions": [',
    "    {",
    '      "id": "string",',
    '      "title": "string",',
    '      "type": "text | single_choice | multi_choice",',
    '      "required": true,',
    '      "placeholder": "string optional",',
    '      "options": [{"id":"string","label":"string"}]',
    "    }",
    "  ]",
    "}",
    "Keine Analyse. Kein Markdown. Kein Text au\xDFerhalb des JSON."
  ].join("\n");
}
__name(buildGoalRefinementPrompt, "buildGoalRefinementPrompt");
function buildPlannerPrompt() {
  return [
    "Du bist eine au\xDFergew\xF6hnlich kreative, psychologisch kluge Planungs-KI.",
    "Du bekommst:",
    "- Ziel",
    "- fr\xFChere Ziele",
    "- Antworten auf vertiefende R\xFCckfragen",
    "- Produktivit\xE4tssignale",
    "- Nutzerprofil",
    "- freie Kalender-Slots",
    "",
    "Erstelle kein banales Standard-Ergebnis.",
    'Vermeide generische Tipps wie "mehr spazieren", "einfach \xF6fter trainieren", "mehr schlafen", au\xDFer sie sind extrem personalisiert.',
    "",
    "Antworte mit einem Bundle aus:",
    "- primary: Hauptplan",
    "- alternatives: 2 alternative Richtungen",
    "- routines: 0 bis 2 Routinen mit mehreren Terminen pro Woche",
    "- optional scheduleAdjustment: wenn im Zeitplan etwas klar fehlt",
    "- review: Nach wie vielen Tagen Wirkung gepr\xFCft werden soll und welche Fragen dann gestellt werden sollen",
    "",
    "Denke in diesen Richtungen:",
    "- behavior design",
    "- friction reduction",
    "- environmental design",
    "- identity reinforcement",
    "- emotional regulation",
    "- recovery strategy",
    "",
    "Regeln:",
    "- Todo = konkret, originell, nicht banal, eher als klare Anweisung formuliert.",
    "- Habit = klein, aber intelligent und sp\xFCrbar.",
    "- Calendar = sinnvoller freier Slot ab morgen, niemals in der Vergangenheit.",
    "- Routines d\xFCrfen mehrfach pro Woche geplant werden, z.B. Training 3x/Woche.",
    "- Nutze nur freie Slots aus freeSlots.",
    "- scheduleAdjustment soll einen Zeitplan-Hinweis geben, wenn das Ziel eigentlich schon Kalenderraum br\xE4uchte.",
    "- Jede Komponente braucht eine klare reason.",
    "- Gib nach M\xF6glichkeit instruction und expectedEffect zur\xFCck.",
    "- Mindestens eine Alternative soll ungew\xF6hnlich und \xFCberraschend sein, aber realistisch.",
    "",
    "Antworte ausschlie\xDFlich als JSON.",
    "Format:",
    "{",
    '  "primary": {',
    '    "todo": { "title": "string", "reason": "string", "instruction": "string", "expectedEffect": "string" },',
    '    "habit": { "title": "string", "reason": "string", "instruction": "string", "expectedEffect": "string" },',
    '    "calendar": { "title": "string", "start": "ISO", "end": "ISO", "reason": "string", "instruction": "string" },',
    '    "routines": [',
    "      {",
    '        "title": "string",',
    '        "reason": "string",',
    '        "instruction": "string",',
    '        "frequencyPerWeek": 3,',
    '        "durationMinutes": 35,',
    '        "reviewAfterDays": 14,',
    '        "blocks": [{ "title": "string", "start": "ISO", "end": "ISO" }]',
    "      }",
    "    ],",
    '    "scheduleAdjustment": { "title": "string", "reason": "string", "instruction": "string", "expectedEffect": "string" },',
    '    "review": { "reviewAfterDays": 7, "questions": ["string"] }',
    "  },",
    '  "alternatives": [',
    "    {",
    '      "label": "string",',
    '      "todo": { "title": "string", "reason": "string", "instruction": "string", "expectedEffect": "string" },',
    '      "habit": { "title": "string", "reason": "string", "instruction": "string", "expectedEffect": "string" },',
    '      "calendar": { "title": "string", "start": "ISO", "end": "ISO", "reason": "string", "instruction": "string" }',
    "    }",
    "  ]",
    "}",
    "Keine Analyse. Kein Markdown. Kein Text au\xDFerhalb des JSON."
  ].join("\n");
}
__name(buildPlannerPrompt, "buildPlannerPrompt");
async function callGroqGoalRefinement(env, body) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_completion_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildGoalRefinementPrompt()
        },
        {
          role: "user",
          content: JSON.stringify(body)
        }
      ]
    })
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Groq refine error ${res.status}: ${raw}`);
  }
  const parsed = JSON.parse(raw);
  const content = parsed?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Groq refine content missing");
  }
  const jsonObj = extractJsonObject(content);
  const normalized = normalizeGoalRefinement(jsonObj);
  if (!normalized) {
    throw new Error(`Invalid goal refinement JSON: ${content}`);
  }
  return normalized;
}
__name(callGroqGoalRefinement, "callGroqGoalRefinement");
async function callGroqPlanner(env, body) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.45,
      max_completion_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildPlannerPrompt()
        },
        {
          role: "user",
          content: JSON.stringify({
            goal: topGoal(body.goals),
            goals: body.goals.map((g) => g.title),
            answers: body.answers ?? {},
            signals: body.signals,
            profile: body.profile,
            userPlanningProfile: body.userPlanningProfile ?? null,
            freeSlots: body.freeSlots ?? []
          })
        }
      ]
    })
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Groq planner error ${res.status}: ${raw}`);
  }
  const parsed = JSON.parse(raw);
  const content = parsed?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Groq planner content missing");
  }
  const jsonObj = extractJsonObject(content);
  const normalized = normalizePlannerBundle(jsonObj);
  if (!normalized) {
    throw new Error(`Invalid planner JSON: ${content}`);
  }
  return normalized;
}
__name(callGroqPlanner, "callGroqPlanner");
var src_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return json({}, { status: 200 });
    }
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true }, { status: 200 });
    }
    if (request.method === "POST" && url.pathname === "/goal/refine") {
      let body;
      try {
        body = await request.json();
      } catch (error) {
        return json(
          {
            error: "Invalid request body",
            details: error instanceof Error ? error.message : "unknown"
          },
          { status: 400 }
        );
      }
      try {
        const result = await callGroqGoalRefinement(env, body);
        return json(result, { status: 200 });
      } catch (error) {
        console.log("Groq goal refinement failed, using fallback:", error);
        return json(buildFallbackGoalRefinement(body), { status: 200 });
      }
    }
    if (request.method === "POST" && url.pathname === "/planner/suggest") {
      let body;
      try {
        body = await request.json();
      } catch (error) {
        return json(
          {
            error: "Invalid request body",
            details: error instanceof Error ? error.message : "unknown"
          },
          { status: 400 }
        );
      }
      try {
        const result = await callGroqPlanner(env, body);
        return json(result, { status: 200 });
      } catch (error) {
        console.log("Groq planner failed, using fallback:", error);
        return json(buildFallbackPlanner(body), { status: 200 });
      }
    }
    return json({ error: "Not found" }, { status: 404 });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-KTFdvd/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-KTFdvd/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
