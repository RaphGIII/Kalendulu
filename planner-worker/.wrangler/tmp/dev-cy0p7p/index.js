var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/coachEngine.ts
function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
__name(uid, "uid");
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
__name(clamp, "clamp");
function normalizeText(input) {
  return input.trim().toLowerCase();
}
__name(normalizeText, "normalizeText");
function average(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
__name(average, "average");
function daysUntil(targetDateIso) {
  const now = Date.now();
  const target = new Date(targetDateIso).getTime();
  if (!Number.isFinite(target)) return 90;
  return Math.max(1, Math.ceil((target - now) / (1e3 * 60 * 60 * 24)));
}
__name(daysUntil, "daysUntil");
function inferDomain(goalTitle, fallback) {
  const g = normalizeText(goalTitle);
  if (g.includes("schach") || g.includes("elo")) return "chess";
  if (g.includes("klavier") || g.includes("gitarre") || g.includes("violine") || g.includes("mondscheinsonate") || g.includes("beethoven") || g.includes("musik")) {
    return "music";
  }
  if (g.includes("abnehmen") || g.includes("fett") || g.includes("muskel") || g.includes("fitness") || g.includes("lauf") || g.includes("zunehmen")) {
    return "fitness";
  }
  if (g.includes("doktor") || g.includes("master") || g.includes("pr\xFCfung") || g.includes("lernen") || g.includes("studium")) {
    return "study";
  }
  if (g.includes("unternehmen") || g.includes("startup") || g.includes("firma") || g.includes("business")) {
    return "business";
  }
  if (g.includes("buch") || g.includes("roman") || g.includes("schreiben")) {
    return "writing";
  }
  if (g.includes("projekt") || g.includes("app") || g.includes("produkt")) {
    return "project";
  }
  return fallback;
}
__name(inferDomain, "inferDomain");
function severityNumber(severity) {
  return severity;
}
__name(severityNumber, "severityNumber");
function scoreNodeBase(node) {
  return severityNumber(node.severity) * 0.6 + node.volatility * 2 + node.confidence;
}
__name(scoreNodeBase, "scoreNodeBase");
function findNodeByLabel(nodes, label) {
  return nodes.find((n) => n.label === label);
}
__name(findNodeByLabel, "findNodeByLabel");
function mapLabelsToNodeIds(labels, nodes) {
  return labels.map((label) => findNodeByLabel(nodes, label)?.id).filter((id) => typeof id === "string");
}
__name(mapLabelsToNodeIds, "mapLabelsToNodeIds");
function tokenizeSignals(signals) {
  return signals.flatMap((signal) => [signal.key, String(signal.value)]).map(normalizeText).join(" ");
}
__name(tokenizeSignals, "tokenizeSignals");
var PATTERN_LIBRARY = [
  {
    key: "chess_calculation_tree",
    domain: "chess",
    triggerKeywords: ["schach", "elo", "1800", "2000", "berechnung", "taktik"],
    createNodes: [
      {
        label: "Hauptengpass: Rechen- und Entscheidungsqualit\xE4t",
        kind: "root_problem",
        severity: 5,
        volatility: 0.7,
        confidence: 0.92,
        description: "Nicht blo\xDF fehlendes Wissen, sondern eine zu instabile Berechnungs- und Entscheidungsarchitektur blockiert den Ratinganstieg.",
        tags: ["chess", "root"]
      },
      {
        label: "Schwache Kandidatenzug-Disziplin",
        kind: "skill_gap",
        severity: 5,
        volatility: 0.82,
        confidence: 0.9,
        description: "Der Nutzer pr\xFCft Kandidatenz\xFCge nicht systematisch genug und rechnet dadurch ungleichm\xE4\xDFig.",
        tags: ["chess", "calculation"]
      },
      {
        label: "Conversion-Instabilit\xE4t in besseren Stellungen",
        kind: "execution_gap",
        severity: 4,
        volatility: 0.72,
        confidence: 0.86,
        description: "Vorteile werden nicht sauber technisch verwertet.",
        tags: ["chess", "conversion"]
      },
      {
        label: "Endspieltechnik l\xFCckenhaft",
        kind: "knowledge_gap",
        severity: 4,
        volatility: 0.55,
        confidence: 0.82,
        description: "Vereinfachungs- und Endspielentscheidungen sind technisch zu unsicher.",
        tags: ["chess", "endgame"]
      },
      {
        label: "Musterkompression zu schwach",
        kind: "pattern",
        severity: 4,
        volatility: 0.64,
        confidence: 0.8,
        description: "Wiederkehrende Motivfamilien werden nicht schnell genug erkannt.",
        tags: ["chess", "patterns"]
      },
      {
        label: "Zeitmanagement kollabiert in kritischen Stellungen",
        kind: "failure_mode",
        severity: 4,
        volatility: 0.88,
        confidence: 0.8,
        description: "Unter Druck brechen Suchqualit\xE4t und Priorisierung ein.",
        tags: ["chess", "time"]
      },
      {
        label: "Hebel: Kandidatenzugprozess erzwingen",
        kind: "leverage_point",
        severity: 5,
        volatility: 0.2,
        confidence: 0.95,
        description: "Ein expliziter Kandidatenzugprozess reduziert Folgefehler in mehreren Bereichen gleichzeitig.",
        tags: ["chess", "leverage"]
      }
    ],
    createEdges: [
      {
        fromLabel: "Hauptengpass: Rechen- und Entscheidungsqualit\xE4t",
        toLabel: "Schwache Kandidatenzug-Disziplin",
        relation: "reveals",
        weight: 0.9,
        confidence: 0.95
      },
      {
        fromLabel: "Schwache Kandidatenzug-Disziplin",
        toLabel: "Conversion-Instabilit\xE4t in besseren Stellungen",
        relation: "causes",
        weight: 0.76,
        confidence: 0.9
      },
      {
        fromLabel: "Endspieltechnik l\xFCckenhaft",
        toLabel: "Conversion-Instabilit\xE4t in besseren Stellungen",
        relation: "amplifies",
        weight: 0.7,
        confidence: 0.84
      },
      {
        fromLabel: "Musterkompression zu schwach",
        toLabel: "Schwache Kandidatenzug-Disziplin",
        relation: "amplifies",
        weight: 0.7,
        confidence: 0.82
      },
      {
        fromLabel: "Zeitmanagement kollabiert in kritischen Stellungen",
        toLabel: "Schwache Kandidatenzug-Disziplin",
        relation: "amplifies",
        weight: 0.8,
        confidence: 0.82
      },
      {
        fromLabel: "Hebel: Kandidatenzugprozess erzwingen",
        toLabel: "Schwache Kandidatenzug-Disziplin",
        relation: "solves",
        weight: 0.95,
        confidence: 0.95
      }
    ],
    createLeverage: [
      {
        label: "Kandidatenzug-Protokoll",
        targetLabels: ["Schwache Kandidatenzug-Disziplin"],
        explanation: "Ein strukturierter Suchprozess zwingt zu besserer Berechnung und reduziert Fehlerketten.",
        expectedImpact: 0.95,
        difficulty: 0.66,
        urgency: 0.95,
        compoundingValue: 0.92
      },
      {
        label: "Conversion-Training aus besseren Stellungen",
        targetLabels: ["Conversion-Instabilit\xE4t in besseren Stellungen"],
        explanation: "Wer bessere Stellungen stabil gewinnt, hebt schnell das praktische Niveau.",
        expectedImpact: 0.88,
        difficulty: 0.72,
        urgency: 0.82,
        compoundingValue: 0.82
      }
    ],
    createPatterns: [
      {
        label: "Rechenbaum bricht an kritischem Verzweigungspunkt ab",
        explanation: "Nicht Blindheit, sondern zu fr\xFChes Stoppen der Varianten verursacht viele Fehler.",
        repetitionLikelihood: 0.86,
        coachingValue: 0.96,
        linkedLabels: ["Schwache Kandidatenzug-Disziplin"]
      },
      {
        label: "Vorteile werden ohne technische Kontrolle wieder abgegeben",
        explanation: "Mehrere Bereiche leiden unter fehlender Konvertierungsroutine.",
        repetitionLikelihood: 0.8,
        coachingValue: 0.9,
        linkedLabels: ["Conversion-Instabilit\xE4t in besseren Stellungen"]
      }
    ],
    createFailures: [
      {
        label: "Zu viel Blitz, zu wenig Tiefenanalyse",
        triggerLabels: ["Zeitmanagement kollabiert in kritischen Stellungen"],
        consequenceLabels: [
          "Schwache Kandidatenzug-Disziplin",
          "Conversion-Instabilit\xE4t in besseren Stellungen"
        ],
        probability: 0.72,
        severity: 0.78,
        preventionActionHints: [
          "Weniger oberfl\xE4chliche Volumenreize",
          "Mehr tiefe Variantenanalyse",
          "Partien forensisch zerlegen"
        ]
      }
    ],
    createActions: [
      {
        title: "Kandidatenzug-Protokoll auf 30 kritische Stellungen anwenden",
        type: "milestone",
        description: "Jede Stellung mit 3 Kandidatenz\xFCgen, Gegnerantworten und forcing lines schriftlich l\xF6sen.",
        durationDays: 10,
        effort: 0.82,
        directTargetLabels: ["Schwache Kandidatenzug-Disziplin"],
        indirectTargetLabels: ["Hauptengpass: Rechen- und Entscheidungsqualit\xE4t"],
        riskLabels: ["Zeitmanagement kollabiert in kritischen Stellungen"],
        unlockLabels: ["Conversion-Instabilit\xE4t in besseren Stellungen"],
        successSignals: [
          "weniger taktische Grobfehler",
          "klarerer Denkprozess",
          "bessere Variantendisziplin"
        ]
      },
      {
        title: "Conversion-Block aus besseren Stellungen",
        type: "milestone",
        description: "Gewonnene oder bessere Stellungen systematisch ausspielen und technisch bewerten.",
        durationDays: 12,
        effort: 0.78,
        directTargetLabels: ["Conversion-Instabilit\xE4t in besseren Stellungen"],
        indirectTargetLabels: ["Endspieltechnik l\xFCckenhaft"],
        riskLabels: [],
        unlockLabels: ["Hauptengpass: Rechen- und Entscheidungsqualit\xE4t"],
        successSignals: [
          "mehr verwertete Vorteile",
          "ruhigere Vereinfachungsentscheidungen"
        ]
      },
      {
        title: "Deep Calculation Routine",
        type: "routine",
        description: "2 bis 4 Mal pro Woche wenige harte Stellungen komplett durchrechnen.",
        durationDays: 60,
        effort: 0.7,
        directTargetLabels: ["Schwache Kandidatenzug-Disziplin"],
        indirectTargetLabels: ["Musterkompression zu schwach"],
        riskLabels: [],
        unlockLabels: ["Hauptengpass: Rechen- und Entscheidungsqualit\xE4t"],
        repeatPerWeek: 3,
        minutesPerSession: 50,
        successSignals: [
          "mehr Berechnungstiefe",
          "weniger fr\xFChe Variantenabbr\xFCche"
        ]
      }
    ]
  },
  {
    key: "moonlight_micro_skill_tree",
    domain: "music",
    triggerKeywords: ["mondscheinsonate", "klavier", "beethoven", "noten", "st\xFCck"],
    createNodes: [
      {
        label: "Hauptengpass: St\xFCck wird nicht als Muster- und Mikroskill-System zerlegt",
        kind: "root_problem",
        severity: 5,
        volatility: 0.82,
        confidence: 0.9,
        description: "Das St\xFCck wird als Ganzes ge\xFCbt statt in wiederkehrende Lesemuster, Bewegungsmuster und musikalische Teilprobleme zerlegt.",
        tags: ["music", "root"]
      },
      {
        label: "Notendekodierung zu langsam",
        kind: "skill_gap",
        severity: 4,
        volatility: 0.72,
        confidence: 0.84,
        description: "Das Lesen und Zuordnen von Noten verbraucht zu viel kognitive Energie.",
        tags: ["music", "note_reading"]
      },
      {
        label: "Linke-Hand-Muster nicht gechunkt",
        kind: "pattern",
        severity: 5,
        volatility: 0.66,
        confidence: 0.88,
        description: "Wiederkehrende Figuren werden nicht als Bausteine erkannt.",
        tags: ["music", "left_hand"]
      },
      {
        label: "Fingersatz-Instabilit\xE4t",
        kind: "execution_gap",
        severity: 4,
        volatility: 0.74,
        confidence: 0.82,
        description: "Instabiler Fingersatz verhindert Automatisierung.",
        tags: ["music", "fingering"]
      },
      {
        label: "Rhythmische Spannung ohne sauberen Puls",
        kind: "failure_mode",
        severity: 3,
        volatility: 0.7,
        confidence: 0.78,
        description: "Tempo und Ausdruck kippen, weil Puls und Unterteilung nicht stabil genug sind.",
        tags: ["music", "rhythm"]
      },
      {
        label: "Hebel: Motiv- und Musterbibliothek aufbauen",
        kind: "leverage_point",
        severity: 5,
        volatility: 0.2,
        confidence: 0.95,
        description: "Wer Musterfamilien erkennt, lernt das St\xFCck nicht Ton f\xFCr Ton.",
        tags: ["music", "leverage"]
      }
    ],
    createEdges: [
      {
        fromLabel: "Hauptengpass: St\xFCck wird nicht als Muster- und Mikroskill-System zerlegt",
        toLabel: "Linke-Hand-Muster nicht gechunkt",
        relation: "causes",
        weight: 0.9,
        confidence: 0.94
      },
      {
        fromLabel: "Notendekodierung zu langsam",
        toLabel: "Fingersatz-Instabilit\xE4t",
        relation: "amplifies",
        weight: 0.64,
        confidence: 0.8
      },
      {
        fromLabel: "Linke-Hand-Muster nicht gechunkt",
        toLabel: "Rhythmische Spannung ohne sauberen Puls",
        relation: "amplifies",
        weight: 0.62,
        confidence: 0.76
      },
      {
        fromLabel: "Hebel: Motiv- und Musterbibliothek aufbauen",
        toLabel: "Linke-Hand-Muster nicht gechunkt",
        relation: "solves",
        weight: 0.95,
        confidence: 0.95
      }
    ],
    createLeverage: [
      {
        label: "Muster-Chunks identifizieren",
        targetLabels: ["Linke-Hand-Muster nicht gechunkt"],
        explanation: "Wenn Bausteine statt Einzelnoten gelernt werden, steigt die Lerngeschwindigkeit massiv.",
        expectedImpact: 0.95,
        difficulty: 0.6,
        urgency: 0.92,
        compoundingValue: 0.94
      }
    ],
    createPatterns: [
      {
        label: "Wiederkehrende linke-Hand-Formen",
        explanation: "Viele scheinbar neue Passagen sind Varianten derselben Bewegungsstruktur.",
        repetitionLikelihood: 0.9,
        coachingValue: 0.95,
        linkedLabels: ["Linke-Hand-Muster nicht gechunkt"]
      }
    ],
    createFailures: [
      {
        label: "Ganzes St\xFCck zu fr\xFCh im Zieltempo",
        triggerLabels: ["Rhythmische Spannung ohne sauberen Puls"],
        consequenceLabels: ["Fingersatz-Instabilit\xE4t"],
        probability: 0.78,
        severity: 0.72,
        preventionActionHints: [
          "Abschnittsweise chunken",
          "Fingersatz fixieren",
          "Puls sichern, bevor Tempo steigt"
        ]
      }
    ],
    createActions: [
      {
        title: "Musterkarte der ersten Seite erstellen",
        type: "milestone",
        description: "Nicht Noten abschreiben, sondern Musterfamilien, Wiederholungen und Bewegungsgruppen markieren.",
        durationDays: 5,
        effort: 0.72,
        directTargetLabels: ["Linke-Hand-Muster nicht gechunkt"],
        indirectTargetLabels: ["Hauptengpass: St\xFCck wird nicht als Muster- und Mikroskill-System zerlegt"],
        riskLabels: ["Rhythmische Spannung ohne sauberen Puls"],
        unlockLabels: ["Fingersatz-Instabilit\xE4t"],
        successSignals: [
          "weniger Einzelnote-Denken",
          "schnellere Abschnittsaufnahme"
        ]
      },
      {
        title: "Linke Hand isoliert in Chunk-Familien automatisieren",
        type: "milestone",
        description: "Gruppiere wiederkehrende Bewegungsformen und trainiere sie getrennt.",
        durationDays: 9,
        effort: 0.8,
        directTargetLabels: ["Linke-Hand-Muster nicht gechunkt"],
        indirectTargetLabels: ["Fingersatz-Instabilit\xE4t"],
        riskLabels: [],
        unlockLabels: ["Hauptengpass: St\xFCck wird nicht als Muster- und Mikroskill-System zerlegt"],
        successSignals: [
          "mehr Stabilit\xE4t",
          "weniger kognitive \xDCberlastung"
        ]
      },
      {
        title: "Notenlesen-Speed Routine",
        type: "routine",
        description: "T\xE4gliche kurze Dekodierungs- und Lesegeschwindigkeitsroutine.",
        durationDays: 50,
        effort: 0.48,
        directTargetLabels: ["Notendekodierung zu langsam"],
        indirectTargetLabels: ["Fingersatz-Instabilit\xE4t"],
        riskLabels: [],
        unlockLabels: ["Linke-Hand-Muster nicht gechunkt"],
        repeatPerWeek: 6,
        minutesPerSession: 15,
        successSignals: [
          "schnelleres visuelles Erfassen",
          "weniger Stocken"
        ]
      }
    ]
  }
];
function buildBaseNodes(input, inferredDomain) {
  const targetDays = daysUntil(input.targetDateIso);
  return [
    {
      id: uid("node"),
      label: `Ziel: ${input.goalTitle}`,
      kind: "objective",
      severity: 5,
      volatility: 0.2,
      confidence: 1,
      description: "Das Endziel des Systems.",
      tags: [inferredDomain, "goal"]
    },
    {
      id: uid("node"),
      label: `Zeitfenster: ${targetDays} Tage`,
      kind: "constraint",
      severity: targetDays < 60 ? 5 : targetDays < 120 ? 4 : 3,
      volatility: 0.12,
      confidence: 1,
      description: "Die Deadline beeinflusst Belastung, Reihenfolge und Priorisierung.",
      tags: [inferredDomain, "time"]
    },
    {
      id: uid("node"),
      label: `Wochenkapazit\xE4t: ${input.weeklyHours}h`,
      kind: "resource",
      severity: input.weeklyHours < 4 ? 5 : input.weeklyHours < 8 ? 4 : 3,
      volatility: 0.22,
      confidence: 0.95,
      description: "Die verf\xFCgbare Wochenzeit begrenzt realistische Intensit\xE4t und Suchbreite.",
      tags: [inferredDomain, "resource"]
    }
  ];
}
__name(buildBaseNodes, "buildBaseNodes");
function applyPatternLibrary(input, inferredDomain) {
  const text = `${normalizeText(input.goalTitle)} ${tokenizeSignals(input.signals)}`;
  const matches = PATTERN_LIBRARY.filter((template) => {
    if (template.domain !== "all" && template.domain !== inferredDomain) return false;
    return template.triggerKeywords.some((kw) => text.includes(normalizeText(kw)));
  });
  const nodes = [];
  const edges = [];
  const leverageInsights = [];
  const patternInsights = [];
  const failureScenarios = [];
  const actionSeeds = [];
  for (const template of matches) {
    const createdNodes = template.createNodes.map((node) => ({ ...node, id: uid("node") }));
    nodes.push(...createdNodes);
    for (const edge of template.createEdges) {
      const from = findNodeByLabel(createdNodes, edge.fromLabel);
      const to = findNodeByLabel(createdNodes, edge.toLabel);
      if (!from || !to) continue;
      edges.push({
        id: uid("edge"),
        from: from.id,
        to: to.id,
        relation: edge.relation,
        weight: edge.weight,
        confidence: edge.confidence
      });
    }
    for (const lev of template.createLeverage ?? []) {
      leverageInsights.push({
        id: uid("lev"),
        label: lev.label,
        targetNodeIds: mapLabelsToNodeIds(lev.targetLabels, createdNodes),
        explanation: lev.explanation,
        expectedImpact: lev.expectedImpact,
        difficulty: lev.difficulty,
        urgency: lev.urgency,
        compoundingValue: lev.compoundingValue
      });
    }
    for (const pat of template.createPatterns ?? []) {
      patternInsights.push({
        id: uid("pat"),
        label: pat.label,
        explanation: pat.explanation,
        repetitionLikelihood: pat.repetitionLikelihood,
        coachingValue: pat.coachingValue,
        linkedNodeIds: mapLabelsToNodeIds(pat.linkedLabels, createdNodes)
      });
    }
    for (const failure of template.createFailures ?? []) {
      failureScenarios.push({
        id: uid("fail"),
        label: failure.label,
        triggerNodeIds: mapLabelsToNodeIds(failure.triggerLabels, createdNodes),
        consequenceNodeIds: mapLabelsToNodeIds(failure.consequenceLabels, createdNodes),
        probability: failure.probability,
        severity: failure.severity,
        preventionActionHints: failure.preventionActionHints
      });
    }
    for (const action of template.createActions ?? []) {
      actionSeeds.push({
        id: uid("action"),
        title: action.title,
        type: action.type,
        description: action.description,
        durationDays: action.durationDays,
        effort: action.effort,
        directTargets: mapLabelsToNodeIds(action.directTargetLabels, createdNodes),
        indirectTargets: mapLabelsToNodeIds(action.indirectTargetLabels, createdNodes),
        riskNodes: mapLabelsToNodeIds(action.riskLabels, createdNodes),
        unlockNodes: mapLabelsToNodeIds(action.unlockLabels, createdNodes),
        repeatPerWeek: action.repeatPerWeek,
        minutesPerSession: action.minutesPerSession,
        successSignals: action.successSignals
      });
    }
  }
  return {
    nodes,
    edges,
    leverageInsights,
    patternInsights,
    failureScenarios,
    actionSeeds
  };
}
__name(applyPatternLibrary, "applyPatternLibrary");
function buildGraph(input, inferredDomain) {
  const baseNodes = buildBaseNodes(input, inferredDomain);
  const injected = applyPatternLibrary(input, inferredDomain);
  return {
    nodes: [...baseNodes, ...injected.nodes],
    edges: [...injected.edges],
    leverageInsights: [...injected.leverageInsights],
    patternInsights: [...injected.patternInsights],
    failureScenarios: [...injected.failureScenarios],
    actionSeeds: [...injected.actionSeeds]
  };
}
__name(buildGraph, "buildGraph");
function pickBestRootProblem(nodes) {
  const roots = nodes.filter((n) => n.kind === "root_problem");
  if (roots.length) {
    return [...roots].sort((a, b) => scoreNodeBase(b) - scoreNodeBase(a))[0];
  }
  return [...nodes].sort((a, b) => scoreNodeBase(b) - scoreNodeBase(a))[0];
}
__name(pickBestRootProblem, "pickBestRootProblem");
function buildSyntheticActions(nodes, leverageInsights, difficultyLevel) {
  const sortedLeverage = [...leverageInsights].sort((a, b) => {
    const scoreA = a.expectedImpact * a.urgency * (1 + a.compoundingValue) / Math.max(a.difficulty, 0.1);
    const scoreB = b.expectedImpact * b.urgency * (1 + b.compoundingValue) / Math.max(b.difficulty, 0.1);
    return scoreB - scoreA;
  });
  const actions = [];
  for (const lev of sortedLeverage.slice(0, 6)) {
    actions.push({
      id: uid("action"),
      title: lev.label,
      type: "milestone",
      description: lev.explanation,
      durationDays: difficultyLevel >= 8 ? 10 : 7,
      effort: clamp(lev.difficulty, 0.35, 0.95),
      directTargets: lev.targetNodeIds,
      indirectTargets: [],
      riskNodes: [],
      unlockNodes: lev.targetNodeIds,
      successSignals: [
        `Hebel aktiviert: ${lev.label}`,
        "mehr Systemstabilit\xE4t"
      ]
    });
  }
  const highSeverity = [...nodes].filter(
    (n) => ["skill_gap", "knowledge_gap", "execution_gap", "failure_mode"].includes(n.kind)
  ).sort((a, b) => severityNumber(b.severity) - severityNumber(a.severity)).slice(0, 5);
  for (const node of highSeverity) {
    actions.push({
      id: uid("action"),
      title: `Engpass gezielt bearbeiten: ${node.label}`,
      type: node.kind === "failure_mode" ? "constraint_fix" : "skill_builder",
      description: node.description,
      durationDays: 5 + node.severity,
      effort: clamp(0.35 + node.severity * 0.1, 0.4, 0.9),
      directTargets: [node.id],
      indirectTargets: [],
      riskNodes: [],
      unlockNodes: [node.id],
      successSignals: [`Node reduziert: ${node.label}`],
      repeatPerWeek: 2,
      minutesPerSession: 30 + node.severity * 5
    });
  }
  return actions;
}
__name(buildSyntheticActions, "buildSyntheticActions");
function scoreActionCandidate(action, nodes, failureScenarios, leverageInsights, userStyle) {
  const directNodes = nodes.filter((n) => action.directTargets.includes(n.id));
  const directSeverity = directNodes.reduce((sum, n) => sum + severityNumber(n.severity), 0);
  const matchingLeverage = leverageInsights.filter(
    (l) => l.targetNodeIds.some((id) => action.directTargets.includes(id))
  );
  const leverageScore = directSeverity * 1.6 + matchingLeverage.reduce(
    (sum, l) => sum + l.expectedImpact * 5 + l.compoundingValue * 3,
    0
  );
  const failurePenalty = failureScenarios.reduce((sum, scenario) => {
    const hits = scenario.triggerNodeIds.some((id) => action.riskNodes.includes(id));
    return sum + (hits ? scenario.probability * scenario.severity * 6 : 0);
  }, 0);
  const ambition = userStyle?.ambition ?? 0.82;
  const perfectionism = userStyle?.perfectionism ?? 0.88;
  const pressureTolerance = userStyle?.pressureTolerance ?? 0.75;
  const consistency = userStyle?.consistency ?? 0.6;
  const stretchBonus = action.effort * ambition * 3.4;
  const precisionBonus = (action.directTargets.length + action.unlockNodes.length) * perfectionism * 0.9;
  const overloadPenalty = Math.max(0, action.effort - pressureTolerance) * (1.4 - consistency) * 4.8;
  return leverageScore + stretchBonus + precisionBonus - failurePenalty - overloadPenalty;
}
__name(scoreActionCandidate, "scoreActionCandidate");
function buildPhasePlans(actionPool, nodes, failureScenarios, leverageInsights, input) {
  const scored = actionPool.map((action) => ({
    action,
    score: scoreActionCandidate(
      action,
      nodes,
      failureScenarios,
      leverageInsights,
      input.userStyle
    )
  })).sort((a, b) => b.score - a.score);
  const phases = [];
  const chunkSize = 2;
  for (let i = 0; i < scored.length; i += chunkSize) {
    const slice = scored.slice(i, i + chunkSize).map((x) => x.action);
    if (!slice.length) continue;
    phases.push({
      id: uid("phase"),
      title: slice.length === 1 ? slice[0].title : `${slice[0].title} + ${slice[1].title}`,
      rationale: "Diese Phase b\xFCndelt Hebel mit hoher Downstream-Wirkung und guter Systemrelevanz.",
      actions: slice,
      targetNodeIds: Array.from(new Set(slice.flatMap((a) => a.directTargets))),
      estimatedDays: slice.reduce((sum, a) => sum + a.durationDays, 0)
    });
  }
  return phases;
}
__name(buildPhasePlans, "buildPhasePlans");
function evaluatePath(phases, nodes, failureScenarios, leverageInsights) {
  const targetedNodeIds = new Set(phases.flatMap((p) => p.targetNodeIds));
  const targetedNodes = nodes.filter((n) => targetedNodeIds.has(n.id));
  const leverageScore = targetedNodes.reduce(
    (sum, node) => sum + severityNumber(node.severity) * (1 + node.confidence),
    0
  );
  const compoundingScore = leverageInsights.reduce((sum, l) => {
    const touched = l.targetNodeIds.some((id) => targetedNodeIds.has(id));
    return sum + (touched ? l.compoundingValue * 10 : 0);
  }, 0);
  const antiFailureScore = failureScenarios.reduce((sum, failure) => {
    const addressed = failure.triggerNodeIds.some((id) => targetedNodeIds.has(id));
    return sum + (addressed ? (1 - failure.probability) * 6 + failure.severity * 2 : 0);
  }, 0);
  const avgEffort = average(phases.flatMap((p) => p.actions.map((a) => a.effort)));
  const feasibilityScore = Math.max(0, 12 - avgEffort * 8);
  const totalScore = leverageScore + compoundingScore + antiFailureScore + feasibilityScore;
  return {
    leverageScore,
    compoundingScore,
    antiFailureScore,
    feasibilityScore,
    totalScore,
    solvedNodeIds: targetedNodes.map((n) => n.id)
  };
}
__name(evaluatePath, "evaluatePath");
function beamSearchPlans(phases, nodes, failureScenarios, leverageInsights, beamWidth = 4, depth = 4) {
  let frontier = [
    {
      phases: [],
      score: 0,
      solvedNodeIds: [],
      reducedNodeIds: [],
      createdRisks: [],
      explanation: ["Startzustand"]
    }
  ];
  for (let level = 0; level < depth; level += 1) {
    const nextFrontier = [];
    for (const path of frontier) {
      for (const phase of phases) {
        if (path.phases.some((p) => p.id === phase.id)) continue;
        const candidatePhases = [...path.phases, phase];
        const scores = evaluatePath(candidatePhases, nodes, failureScenarios, leverageInsights);
        nextFrontier.push({
          phases: candidatePhases,
          score: scores.totalScore,
          solvedNodeIds: scores.solvedNodeIds,
          reducedNodeIds: scores.solvedNodeIds,
          createdRisks: [],
          explanation: [...path.explanation, `Phase hinzugef\xFCgt: ${phase.title}`]
        });
      }
    }
    nextFrontier.sort((a, b) => b.score - a.score);
    frontier = nextFrontier.slice(0, beamWidth);
    if (!frontier.length) break;
  }
  return frontier.sort((a, b) => b.score - a.score);
}
__name(beamSearchPlans, "beamSearchPlans");
function buildExecutionStepsFromPath(path) {
  return path.phases.map((phase, index) => ({
    id: uid("step"),
    order: index + 1,
    title: phase.title,
    explanation: phase.rationale,
    whyItMatters: "Diese Phase greift die st\xE4rksten Hebel zuerst an und erzeugt Folgewirkung auf sp\xE4tere Probleme.",
    estimatedDays: phase.estimatedDays,
    checklist: phase.actions.slice(0, 4).map((action) => ({
      id: uid("check"),
      label: action.title,
      done: false
    })),
    linkedNodeIds: phase.targetNodeIds
  }));
}
__name(buildExecutionStepsFromPath, "buildExecutionStepsFromPath");
function buildRoutinesFromActions(actions) {
  return actions.filter((action) => action.type === "routine" || typeof action.repeatPerWeek === "number").slice(0, 8).map((action) => ({
    id: uid("routine"),
    title: action.title,
    reason: action.description,
    frequencyPerWeek: action.repeatPerWeek ?? 3,
    durationMinutes: action.minutesPerSession ?? 35,
    linkedNodeIds: action.directTargets
  }));
}
__name(buildRoutinesFromActions, "buildRoutinesFromActions");
function ensureMinimumDepth(actions, domain, rootProblem) {
  if (actions.length >= 6) return actions;
  const rootId = rootProblem?.id ? [rootProblem.id] : [];
  return [
    ...actions,
    {
      id: uid("action"),
      title: "Root-Problem pr\xE4zise isolieren",
      type: "diagnostic",
      description: "Die Hauptengstelle muss scharf abgegrenzt werden, bevor weitere Phasen effizient werden.",
      durationDays: 4,
      effort: 0.58,
      directTargets: rootId,
      indirectTargets: [],
      riskNodes: [],
      unlockNodes: rootId,
      successSignals: ["Root Problem klarer", "weniger generische Planung"]
    },
    {
      id: uid("action"),
      title: `Mikroskill-Tree in ${domain} aufbauen`,
      type: "milestone",
      description: "Zerlege das Ziel in Teilf\xE4higkeiten, damit Training nicht breit und ineffizient bleibt.",
      durationDays: 6,
      effort: 0.66,
      directTargets: rootId,
      indirectTargets: [],
      riskNodes: [],
      unlockNodes: rootId,
      successSignals: ["mehr Klarheit", "bessere Hebelidentifikation"]
    }
  ];
}
__name(ensureMinimumDepth, "ensureMinimumDepth");
function generateMasterBlueprint(input) {
  const inferredDomain = inferDomain(input.goalTitle, input.domain);
  const graphBundle = buildGraph(input, inferredDomain);
  const rootProblemNode = pickBestRootProblem(graphBundle.nodes);
  const syntheticActions = buildSyntheticActions(
    graphBundle.nodes,
    graphBundle.leverageInsights,
    input.difficultyLevel
  );
  const fullActionPool = ensureMinimumDepth(
    [...graphBundle.actionSeeds, ...syntheticActions],
    inferredDomain,
    rootProblemNode
  );
  const phasePlans = buildPhasePlans(
    fullActionPool,
    graphBundle.nodes,
    graphBundle.failureScenarios,
    graphBundle.leverageInsights,
    input
  );
  const searchPaths = beamSearchPlans(
    phasePlans,
    graphBundle.nodes,
    graphBundle.failureScenarios,
    graphBundle.leverageInsights,
    5,
    Math.min(5, Math.max(3, Math.ceil(input.difficultyLevel / 2)))
  );
  const chosenPath = searchPaths[0] ?? {
    phases: [],
    score: 0,
    solvedNodeIds: [],
    reducedNodeIds: [],
    createdRisks: [],
    explanation: ["Keine starke Pfadkombination gefunden."]
  };
  const scoreBreakdownRaw = evaluatePath(
    chosenPath.phases,
    graphBundle.nodes,
    graphBundle.failureScenarios,
    graphBundle.leverageInsights
  );
  const executionSteps = buildExecutionStepsFromPath(chosenPath);
  const routines = buildRoutinesFromActions(fullActionPool);
  return {
    inferredDomain,
    rootProblem: rootProblemNode?.description || rootProblemNode?.label || "Hauptproblem noch nicht tief genug identifiziert.",
    graph: {
      nodes: graphBundle.nodes,
      edges: graphBundle.edges
    },
    patternInsights: graphBundle.patternInsights,
    leverageInsights: graphBundle.leverageInsights,
    failureScenarios: graphBundle.failureScenarios,
    chosenPath,
    alternativePaths: searchPaths.slice(1, 4),
    executionSteps,
    routines,
    scoreBreakdown: {
      leverageScore: Number(scoreBreakdownRaw.leverageScore.toFixed(2)),
      feasibilityScore: Number(scoreBreakdownRaw.feasibilityScore.toFixed(2)),
      antiFailureScore: Number(scoreBreakdownRaw.antiFailureScore.toFixed(2)),
      compoundingScore: Number(scoreBreakdownRaw.compoundingScore.toFixed(2)),
      totalScore: Number(scoreBreakdownRaw.totalScore.toFixed(2))
    }
  };
}
__name(generateMasterBlueprint, "generateMasterBlueprint");

// src/index.ts
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-App-Secret"
    }
  });
}
__name(jsonResponse, "jsonResponse");
function errorResponse(message, status = 400, extra) {
  return jsonResponse({ error: message, ...extra }, status);
}
__name(errorResponse, "errorResponse");
function safeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
__name(safeString, "safeString");
function safeNumber(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
__name(safeNumber, "safeNumber");
function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}
__name(ensureArray, "ensureArray");
function stripCodeFences(text) {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}
__name(stripCodeFences, "stripCodeFences");
function extractFirstJsonObject(text) {
  const cleaned = stripCodeFences(text);
  const start = cleaned.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
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
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth === 0) {
      return cleaned.slice(start, i + 1);
    }
  }
  return null;
}
__name(extractFirstJsonObject, "extractFirstJsonObject");
function parseModelJsonLoose(rawText) {
  try {
    return JSON.parse(stripCodeFences(rawText));
  } catch {
    const extracted = extractFirstJsonObject(rawText);
    if (!extracted) return null;
    try {
      return JSON.parse(extracted);
    } catch {
      return null;
    }
  }
}
__name(parseModelJsonLoose, "parseModelJsonLoose");
function clamp2(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
__name(clamp2, "clamp");
function curvedCount(level, min, max) {
  const safe = clamp2(level, 1, 10);
  const t = (safe - 1) / 9;
  const curved = (Math.exp(2.4 * t) - 1) / (Math.exp(2.4) - 1);
  return Math.round(min + curved * (max - min));
}
__name(curvedCount, "curvedCount");
function questionCountForDifficulty(level) {
  return curvedCount(level, 5, 40);
}
__name(questionCountForDifficulty, "questionCountForDifficulty");
function stepCountForDifficulty(level) {
  return curvedCount(level, 10, 50);
}
__name(stepCountForDifficulty, "stepCountForDifficulty");
function inferGoalType(goal) {
  const g = goal.toLowerCase();
  if (g.includes("abnehm") || g.includes("fett") || g.includes("muskel") || g.includes("fitness") || g.includes("lauf") || g.includes("gesund") || g.includes("zunehmen")) {
    return "fitness";
  }
  if (g.includes("doktor") || g.includes("master") || g.includes("stud") || g.includes("pr\xFCfung")) {
    return "study";
  }
  if (g.includes("paper") || g.includes("forschung") || g.includes("dissertation")) {
    return "research";
  }
  if (g.includes("buch") || g.includes("schreib") || g.includes("roman")) {
    return "writing";
  }
  if (g.includes("unternehmen") || g.includes("startup") || g.includes("firma")) {
    return "business";
  }
  if (g.includes("karriere") || g.includes("bewerb") || g.includes("job")) {
    return "career";
  }
  if (g.includes("sprache") || g.includes("englisch") || g.includes("deutsch")) {
    return "language";
  }
  if (g.includes("projekt") || g.includes("app") || g.includes("produkt")) {
    return "project";
  }
  return "other";
}
__name(inferGoalType, "inferGoalType");
function inferDomain2(goal) {
  const g = goal.toLowerCase();
  if (g.includes("schach") || g.includes("elo")) return "chess";
  if (g.includes("mondscheinsonate") || g.includes("klavier") || g.includes("gitarre") || g.includes("beethoven") || g.includes("musik")) {
    return "music";
  }
  if (g.includes("abnehm") || g.includes("fett") || g.includes("muskel") || g.includes("fitness") || g.includes("lauf") || g.includes("zunehmen")) {
    return "fitness";
  }
  if (g.includes("doktor") || g.includes("master") || g.includes("stud") || g.includes("pr\xFCfung") || g.includes("lernen")) {
    return "study";
  }
  if (g.includes("unternehmen") || g.includes("startup") || g.includes("firma") || g.includes("business")) {
    return "business";
  }
  if (g.includes("schreib") || g.includes("roman") || g.includes("buch")) {
    return "writing";
  }
  if (g.includes("projekt") || g.includes("app") || g.includes("produkt")) {
    return "project";
  }
  return "other";
}
__name(inferDomain2, "inferDomain");
function buildDomainRequirements(goalType) {
  switch (goalType) {
    case "fitness":
      return [
        "Pflicht bei K\xF6rperzielen: aktueller Stand, Zielstand, verf\xFCgbare Zeit, Trainingshistorie, gesundheitliche Grenzen, Engp\xE4sse.",
        "Wenn das Ziel Abnehmen oder Zunehmen ist, m\xFCssen sp\xE4ter konkrete Kalorien-, Protein-, Trainings- und Kontrollparameter ableitbar sein."
      ];
    case "research":
      return [
        "Pflicht bei Forschung/Promotion: Fachgebiet, Status quo, Thema, institutionelle Vorgaben, Deadline, Daten/Literatur, Betreuerstatus, Wochenstunden, Kapitelstatus."
      ];
    case "business":
      return [
        "Pflicht bei Unternehmensaufbau: Branche, Angebot, Startstatus, Budget, verf\xFCgbare Stunden, Vertriebsweg, Zielgruppe, monet\xE4res Ziel."
      ];
    case "writing":
      return [
        "Pflicht bei Schreibzielen: Format, Umfang, Deadline, vorhandenes Material, Schreibstatus, verf\xFCgbare Schreibbl\xF6cke, Qualit\xE4tsanspruch."
      ];
    case "study":
      return [
        "Pflicht bei Lern-/Schach-/Leistungszielen: aktueller Stand, Zielniveau, Wochenstunden, Hauptfehlerquellen, Trainingshistorie, Messkriterien."
      ];
    default:
      return [
        "Fragen m\xFCssen Outcome, Ausgangslage, Zeitrahmen, verf\xFCgbare Zeit, Ressourcen, Hindernisse, Messkriterium und realistische Umsetzung kl\xE4ren."
      ];
  }
}
__name(buildDomainRequirements, "buildDomainRequirements");
function refinementSystemPrompt(targetQuestionCount, goalType) {
  return `
Du bist die Diagnose- und Coaching-KI f\xFCr Kalendulu.
Antworte NUR mit g\xFCltigem JSON.

AUFGABE:
- Analysiere das Ziel.
- Erstelle GENAU ${targetQuestionCount} Fragen auf Deutsch.
- Die Fragen m\xFCssen tief genug sein, damit danach ein hochpr\xE4ziser Blueprint mit Problembaum, Mustererkennung, Hebeln, Failure Modes und milestone-basiertem Plan erzeugt werden kann.
- Schwierige Ziele brauchen deutlich tiefere Diagnostik.
- Die Fragen m\xFCssen nach Relevanz priorisiert sein.
- Nutze Fragearten: text, long_text, single_choice, multi_choice.

COACHING-HALTUNG:
- Denke wie ein fordernder Elite-Coach.
- Gehe davon aus, dass der Benutzer extrem anspruchsvoll und perfektionistisch ist.
- Lieber analytisch, pr\xE4zise und leicht zu hart als banal oder weich.
- Jede Frage soll helfen, Hauptproblem, Unterprobleme, Muster, Mikroskills, Engp\xE4sse oder Failure Modes sichtbar zu machen.

DOM\xC4NENREGELN:
${buildDomainRequirements(goalType).join("\n")}

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
__name(refinementSystemPrompt, "refinementSystemPrompt");
function scoreLabel(value) {
  if (value >= 0.76) return "high";
  if (value >= 0.42) return "medium";
  return "low";
}
__name(scoreLabel, "scoreLabel");
function buildNextCalendarWindow(targetDateIso) {
  const now = /* @__PURE__ */ new Date();
  const start = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
  start.setHours(18, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1e3);
  const target = new Date(targetDateIso);
  if (Number.isFinite(target.getTime()) && end.getTime() > target.getTime()) {
    const adjustedStart = new Date(target.getTime() - 60 * 60 * 1e3);
    return {
      start: adjustedStart.toISOString(),
      end: target.toISOString()
    };
  }
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}
__name(buildNextCalendarWindow, "buildNextCalendarWindow");
function buildRoutineBlocks(frequencyPerWeek, durationMinutes) {
  const count = clamp2(frequencyPerWeek, 1, 5);
  const blocks = [];
  const base = /* @__PURE__ */ new Date();
  base.setHours(19, 0, 0, 0);
  for (let i = 0; i < count; i += 1) {
    const start = new Date(base.getTime() + (i + 1) * 24 * 60 * 60 * 1e3);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1e3);
    blocks.push({
      title: `Routine Block ${i + 1}`,
      start: start.toISOString(),
      end: end.toISOString()
    });
  }
  return blocks;
}
__name(buildRoutineBlocks, "buildRoutineBlocks");
function convertBlueprintToBundle(blueprint, goal, targetDateIso, targetStepCount) {
  const nextCalendar = buildNextCalendarWindow(targetDateIso);
  const mainStep = blueprint.executionSteps[0];
  const mainRoutine = blueprint.routines[0];
  const todoTitle = mainStep?.title || "N\xE4chste Hauptphase starten";
  const habitTitle = mainRoutine?.title || "Wiederkehrenden Fokusblock halten";
  const systemMap = {
    rootProblem: blueprint.rootProblem,
    problemNodes: blueprint.graph.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      severity: node.severity,
      explanation: node.description
    })),
    dependencyEdges: blueprint.graph.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      relation: edge.relation,
      weight: edge.weight
    })),
    patternInsights: blueprint.patternInsights.map((pattern) => ({
      label: pattern.label,
      explanation: pattern.explanation,
      repetitionLikelihood: scoreLabel(pattern.repetitionLikelihood),
      coachingValue: scoreLabel(pattern.coachingValue)
    })),
    leverageInsights: blueprint.leverageInsights.map((lev) => ({
      label: lev.label,
      explanation: lev.explanation,
      expectedImpact: scoreLabel(lev.expectedImpact),
      whyHighLeverage: `Urgency ${lev.urgency.toFixed(2)} \xB7 Compounding ${lev.compoundingValue.toFixed(2)} \xB7 Difficulty ${lev.difficulty.toFixed(2)}`
    })),
    failureScenarios: blueprint.failureScenarios.map((failure) => ({
      label: failure.label,
      trigger: failure.triggerNodeIds.join(", ") || "unbekannt",
      consequence: failure.consequenceNodeIds.join(", ") || "unbekannt",
      prevention: failure.preventionActionHints.join(" \xB7 ")
    }))
  };
  const routines = blueprint.routines.map((routine) => ({
    title: routine.title,
    reason: routine.reason,
    instruction: routine.reason,
    frequencyPerWeek: routine.frequencyPerWeek,
    durationMinutes: routine.durationMinutes,
    reviewAfterDays: 7,
    blocks: buildRoutineBlocks(routine.frequencyPerWeek, routine.durationMinutes)
  }));
  const executionSteps = blueprint.executionSteps.slice(0, targetStepCount).map((step, index) => ({
    id: step.id || `step_${index + 1}`,
    order: index + 1,
    title: step.title,
    explanation: step.explanation,
    whyItMatters: step.whyItMatters,
    estimatedDays: step.estimatedDays,
    checklist: step.checklist.map((item, itemIndex) => ({
      id: item.id || `c_${index + 1}_${itemIndex + 1}`,
      label: item.label,
      done: false
    })),
    linkedTodoTitles: [todoTitle],
    linkedHabitTitles: [habitTitle]
  }));
  while (executionSteps.length < targetStepCount) {
    const i = executionSteps.length;
    executionSteps.push({
      id: `step_${i + 1}`,
      order: i + 1,
      title: `Fortschrittsphase ${i + 1}`,
      explanation: "Zus\xE4tzliche strukturierte Fortschrittsphase zur Vervollst\xE4ndigung des Zielpfads.",
      whyItMatters: "Das Ziel soll vollst\xE4ndig in belastbare Phasen zerlegt bleiben.",
      estimatedDays: 4,
      checklist: [
        {
          id: `c_${i + 1}_1`,
          label: "Phase klar ausf\xFChren",
          done: false
        },
        {
          id: `c_${i + 1}_2`,
          label: "Zwischenergebnis sichern",
          done: false
        }
      ],
      linkedTodoTitles: [todoTitle],
      linkedHabitTitles: [habitTitle]
    });
  }
  return {
    primary: {
      todo: {
        title: todoTitle,
        reason: blueprint.rootProblem || `Hauptengpass f\xFCr "${goal}" muss zuerst sauber angegangen werden.`,
        instruction: mainStep?.explanation || "Starte mit der Phase, die den gr\xF6\xDFten Downstream-Hebel hat.",
        expectedEffect: "Die Hauptengstelle wird reduziert und sp\xE4tere Phasen werden leichter."
      },
      habit: {
        title: habitTitle,
        reason: mainRoutine?.reason || "Ein stabiles wiederkehrendes System tr\xE4gt die milestone-basierten Phasen.",
        instruction: mainRoutine?.reason || "Wiederhole den Kernblock konsequent und messbar.",
        expectedEffect: "Mehr Konstanz und weniger Zerfall zwischen den Phasen."
      },
      calendar: {
        title: mainStep?.title || "Fokusblock",
        start: nextCalendar.start,
        end: nextCalendar.end,
        reason: "Der wichtigste Hebel braucht einen realen Zeitslot statt nur Absicht.",
        instruction: mainStep?.explanation || "Arbeite in diesem Block nur an der aktuell wichtigsten Phase."
      },
      routines
    },
    alternatives: [],
    executionSteps,
    systemMap,
    planMeta: {
      depth: blueprint.executionSteps.length >= 30 ? "full_system" : blueprint.executionSteps.length >= 20 ? "deep" : "balanced",
      difficulty: blueprint.scoreBreakdown.totalScore >= 28 ? "hard" : blueprint.scoreBreakdown.totalScore >= 18 ? "medium" : "easy",
      complexity: blueprint.graph.nodes.length >= 10 ? "high_complexity" : blueprint.graph.nodes.length >= 7 ? "advanced" : "moderate",
      summary: `Blueprint f\xFCr "${goal}" mit Root Problem, Musterstruktur, Hebeln, Failure Modes und ${targetStepCount} Fortschrittsphasen.`,
      targetStepCount,
      coachStyle: "elite_demanding_precision_problem_tree"
    }
  };
}
__name(convertBlueprintToBundle, "convertBlueprintToBundle");
function plannerSystemPrompt(targetStepCount, blueprintBundle) {
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
__name(plannerSystemPrompt, "plannerSystemPrompt");
async function callGroqRaw(params) {
  const body = {
    model: params.model,
    temperature: params.temperature ?? 0.2,
    max_completion_tokens: params.maxCompletionTokens ?? 3800,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user }
    ]
  };
  if (params.forceJson) {
    body.response_format = { type: "json_object" };
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.env.GROQ_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Groq error ${res.status}: ${raw}`);
  }
  const parsed = JSON.parse(raw);
  const content = parsed.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned empty content.");
  }
  return content;
}
__name(callGroqRaw, "callGroqRaw");
function buildFallbackRefinement(goal, difficultyLevel) {
  const count = questionCountForDifficulty(difficultyLevel);
  const goalType = inferGoalType(goal);
  const baseQuestions = [
    {
      id: "target_outcome",
      title: "Was genau willst du konkret erreichen?",
      type: "long_text",
      required: true,
      section: "Ziel",
      whyAsked: "Ohne exakt definiertes Endergebnis kann kein pr\xE4ziser Blueprint gebaut werden.",
      priority: 10,
      placeholder: "Beschreibe das Ziel messbar und konkret."
    },
    {
      id: "starting_point",
      title: "Wo stehst du aktuell genau in Bezug auf dieses Ziel?",
      type: "long_text",
      required: true,
      section: "Ausgangslage",
      whyAsked: "Der Plan h\xE4ngt stark vom echten Startpunkt ab.",
      priority: 10,
      placeholder: "Beschreibe deinen Ist-Zustand."
    },
    {
      id: "deadline",
      title: "Bis wann willst du das Ziel erreichen?",
      type: "text",
      required: true,
      section: "Zeitrahmen",
      whyAsked: "Tempo, Phasen und Belastung h\xE4ngen von der Deadline ab.",
      priority: 9,
      placeholder: "z. B. 2026-10-31"
    },
    {
      id: "weekly_time",
      title: "Wie viele Stunden pro Woche kannst du realistisch investieren?",
      type: "text",
      required: true,
      section: "Ressourcen",
      whyAsked: "Das System muss auf echter verf\xFCgbarer Zeit basieren.",
      priority: 9,
      placeholder: "z. B. 8"
    },
    {
      id: "root_bottleneck_guess",
      title: "Was ist dein gr\xF6\xDFtes Hindernis oder dein gr\xF6\xDFter Engpass?",
      type: "long_text",
      required: true,
      section: "Engpass",
      whyAsked: "Ein guter Coach beginnt mit dem wahrscheinlich gr\xF6\xDFten Downstream-Problem.",
      priority: 8,
      placeholder: "z. B. Technik, Zeitmangel, Fokus, fehlende Struktur, fehlendes Wissen"
    }
  ];
  while (baseQuestions.length < count) {
    const index = baseQuestions.length + 1;
    baseQuestions.push({
      id: `extra_${index}`,
      title: `Zusatzfrage ${index}: Welche Detailinformation fehlt noch, damit das Ziel als Problembaum modelliert werden kann?`,
      type: "text",
      required: true,
      section: "Vertiefung",
      whyAsked: "Komplexe Ziele brauchen Pr\xE4zision auf Unterproblem-Ebene.",
      priority: Math.max(1, 10 - index),
      placeholder: "Kurze, konkrete Antwort"
    });
  }
  return {
    goalLabel: goal || "Neues Ziel",
    goalType,
    questions: baseQuestions.slice(0, count),
    analysis: {
      category: goalType,
      complexity: difficultyLevel >= 8 ? "high_complexity" : difficultyLevel >= 5 ? "advanced" : "moderate",
      difficulty: difficultyLevel >= 9 ? "very_hard" : difficultyLevel >= 7 ? "hard" : difficultyLevel >= 4 ? "medium" : "easy",
      rationale: ["Fallback-Fragenset wurde erzeugt, weil das Modell keine saubere JSON-Antwort geliefert hat."],
      missingInformation: ["Weitere Mikrodetails werden in der n\xE4chsten Planungsstufe modelliert."],
      recommendedQuestionCount: count,
      targetQuestionCount: count
    }
  };
}
__name(buildFallbackRefinement, "buildFallbackRefinement");
function extractWeeklyHours(body) {
  const direct = safeNumber(body.weeklyHours, NaN);
  if (Number.isFinite(direct)) return clamp2(direct, 1, 40);
  const answers = body.answers;
  if (answers) {
    const fromWeeklyHours = Number(answers.weekly_hours);
    if (Number.isFinite(fromWeeklyHours)) return clamp2(fromWeeklyHours, 1, 40);
    const fromMinutesPerDay = Number(answers.minutes_per_day);
    const fromDaysPerWeek = Number(answers.days_per_week);
    if (Number.isFinite(fromMinutesPerDay) && Number.isFinite(fromDaysPerWeek)) {
      return clamp2(fromMinutesPerDay * fromDaysPerWeek / 60, 1, 40);
    }
  }
  return 8;
}
__name(extractWeeklyHours, "extractWeeklyHours");
function buildSignalsFromBody(body) {
  const signals = [];
  const answers = body.answers ?? {};
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      signals.push({
        key,
        value,
        confidence: 0.85
      });
    } else if (Array.isArray(value)) {
      signals.push({
        key,
        value: value.join(", "),
        confidence: 0.75
      });
    }
  }
  const profile = body.profile ?? {};
  for (const [key, value] of Object.entries(profile)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      signals.push({
        key: `profile_${key}`,
        value,
        confidence: 0.75
      });
    }
  }
  const userPlanningProfile = body.userPlanningProfile ?? {};
  for (const [key, value] of Object.entries(userPlanningProfile)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      signals.push({
        key: `planning_${key}`,
        value,
        confidence: 0.72
      });
    }
  }
  return signals;
}
__name(buildSignalsFromBody, "buildSignalsFromBody");
function normalizePlannerBundle(bundle, targetStepCount) {
  const normalizedSteps = ensureArray(bundle.executionSteps).slice(0, targetStepCount).map((step, index) => ({
    id: step.id || `step_${index + 1}`,
    order: index + 1,
    title: step.title,
    explanation: step.explanation,
    whyItMatters: step.whyItMatters,
    estimatedDays: step.estimatedDays,
    checklist: ensureArray(step.checklist).slice(0, 4).map((item, itemIndex) => ({
      id: item.id || `c_${index + 1}_${itemIndex + 1}`,
      label: item.label,
      done: false
    })),
    linkedTodoTitles: ensureArray(step.linkedTodoTitles),
    linkedHabitTitles: ensureArray(step.linkedHabitTitles)
  }));
  while (normalizedSteps.length < targetStepCount) {
    const index = normalizedSteps.length;
    normalizedSteps.push({
      id: `step_${index + 1}`,
      order: index + 1,
      title: `Fortschrittsphase ${index + 1}`,
      explanation: "Zus\xE4tzliche klare Umsetzungsphase zur vollst\xE4ndigen Zielkette.",
      whyItMatters: "Das Ziel soll in belastbare Phasen statt in weiche Tipps zerlegt bleiben.",
      estimatedDays: 4,
      checklist: [
        { id: `c_${index + 1}_1`, label: "Kernaufgabe der Phase durchf\xFChren", done: false },
        { id: `c_${index + 1}_2`, label: "Zwischenergebnis sichern", done: false }
      ],
      linkedTodoTitles: [bundle.primary.todo.title],
      linkedHabitTitles: [bundle.primary.habit.title]
    });
  }
  return {
    ...bundle,
    executionSteps: normalizedSteps
  };
}
__name(normalizePlannerBundle, "normalizePlannerBundle");
function validateSecret(request, env) {
  if (!env.APP_SHARED_SECRET) return true;
  const headerSecret = request.headers.get("X-App-Secret");
  return headerSecret === env.APP_SHARED_SECRET;
}
__name(validateSecret, "validateSecret");
var src_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return jsonResponse({ ok: true });
    }
    if (!validateSecret(request, env)) {
      return errorResponse("Unauthorized", 401);
    }
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return jsonResponse({ ok: true });
      }
      if (request.method !== "POST") {
        return errorResponse("Method not allowed", 405);
      }
      const body = await request.json();
      if (url.pathname === "/goal/refine") {
        const goal = safeString(body.goal).trim();
        const difficultyLevel = clamp2(safeNumber(body.difficultyLevel, 5), 1, 10);
        const targetQuestionCount = questionCountForDifficulty(difficultyLevel);
        const goalType = inferGoalType(goal);
        if (!goal) {
          return errorResponse("Goal is required.", 400);
        }
        const system = refinementSystemPrompt(targetQuestionCount, goalType);
        const user = JSON.stringify({
          goal,
          difficultyLevel,
          targetQuestionCount,
          targetDate: safeString(body.targetDate),
          pastGoals: ensureArray(body.pastGoals),
          profile: body.profile ?? {},
          existingAnswers: body.existingAnswers ?? {}
        });
        try {
          const raw = await callGroqRaw({
            env,
            model: env.GROQ_MODEL_REFINE || "llama-3.3-70b-versatile",
            system,
            user,
            temperature: 0.15,
            maxCompletionTokens: 3e3,
            forceJson: true
          });
          const parsed = parseModelJsonLoose(raw);
          if (!parsed || !Array.isArray(parsed.questions) || !parsed.questions.length) {
            return jsonResponse(buildFallbackRefinement(goal, difficultyLevel));
          }
          const normalized = {
            goalLabel: parsed.goalLabel || goal,
            goalType: parsed.goalType || goalType,
            questions: parsed.questions.slice(0, targetQuestionCount),
            analysis: {
              category: parsed.analysis?.category || goalType,
              complexity: parsed.analysis?.complexity || (difficultyLevel >= 8 ? "high_complexity" : difficultyLevel >= 5 ? "advanced" : "moderate"),
              difficulty: parsed.analysis?.difficulty || (difficultyLevel >= 9 ? "very_hard" : difficultyLevel >= 7 ? "hard" : difficultyLevel >= 4 ? "medium" : "easy"),
              rationale: ensureArray(parsed.analysis?.rationale),
              missingInformation: ensureArray(parsed.analysis?.missingInformation),
              recommendedQuestionCount: targetQuestionCount,
              targetQuestionCount
            }
          };
          return jsonResponse(normalized);
        } catch {
          return jsonResponse(buildFallbackRefinement(goal, difficultyLevel));
        }
      }
      if (url.pathname === "/planner/suggest") {
        const goal = safeString(body.goal).trim();
        const difficultyLevel = clamp2(safeNumber(body.difficultyLevel, 5), 1, 10);
        const targetStepCount = stepCountForDifficulty(difficultyLevel);
        const targetDate = safeString(body.targetDate) || new Date(Date.now() + 90 * 24 * 60 * 60 * 1e3).toISOString();
        if (!goal) {
          return errorResponse("Goal is required.", 400);
        }
        const domain = inferDomain2(goal);
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
            consistency: 0.62
          }
        });
        const deterministicBundle = convertBlueprintToBundle(
          blueprint,
          goal,
          targetDate,
          targetStepCount
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
            deterministicBlueprint: deterministicBundle
          });
          const raw = await callGroqRaw({
            env,
            model: env.GROQ_MODEL_PLAN || "llama-3.3-70b-versatile",
            system,
            user,
            temperature: 0.1,
            maxCompletionTokens: 4200,
            forceJson: true
          });
          const parsed = parseModelJsonLoose(raw);
          if (!parsed || !parsed.primary || !Array.isArray(parsed.executionSteps)) {
            return jsonResponse(deterministicBundle);
          }
          const merged = {
            primary: {
              todo: parsed.primary.todo ?? deterministicBundle.primary.todo,
              habit: parsed.primary.habit ?? deterministicBundle.primary.habit,
              calendar: parsed.primary.calendar ?? deterministicBundle.primary.calendar,
              routines: ensureArray(parsed.primary.routines).length ? ensureArray(parsed.primary.routines) : deterministicBundle.primary.routines
            },
            alternatives: [],
            executionSteps: parsed.executionSteps,
            systemMap: parsed.systemMap ?? deterministicBundle.systemMap,
            planMeta: {
              depth: parsed.planMeta?.depth ?? deterministicBundle.planMeta?.depth,
              difficulty: parsed.planMeta?.difficulty ?? deterministicBundle.planMeta?.difficulty,
              complexity: parsed.planMeta?.complexity ?? deterministicBundle.planMeta?.complexity,
              summary: parsed.planMeta?.summary ?? deterministicBundle.planMeta?.summary,
              targetStepCount,
              coachStyle: parsed.planMeta?.coachStyle ?? deterministicBundle.planMeta?.coachStyle
            }
          };
          return jsonResponse(normalizePlannerBundle(merged, targetStepCount));
        } catch {
          return jsonResponse(deterministicBundle);
        }
      }
      return errorResponse("Not found", 404);
    } catch (error) {
      return errorResponse(error?.message ?? "Unknown error", 500);
    }
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

// .wrangler/tmp/bundle-67Lb9M/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-67Lb9M/middleware-loader.entry.ts
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
