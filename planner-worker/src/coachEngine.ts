export type Domain =
  | 'fitness'
  | 'study'
  | 'research'
  | 'business'
  | 'writing'
  | 'project'
  | 'music'
  | 'chess'
  | 'other';

export type NodeKind =
  | 'root_problem'
  | 'sub_problem'
  | 'constraint'
  | 'skill_gap'
  | 'knowledge_gap'
  | 'execution_gap'
  | 'pattern'
  | 'failure_mode'
  | 'leverage_point'
  | 'resource'
  | 'objective'
  | 'routine'
  | 'state';

export type EdgeRelation =
  | 'causes'
  | 'blocks'
  | 'amplifies'
  | 'depends_on'
  | 'solves'
  | 'supports'
  | 'reveals'
  | 'conflicts_with'
  | 'stabilizes';

export type Severity = 1 | 2 | 3 | 4 | 5;

export type GoalStateSignal = {
  key: string;
  value: string | number | boolean;
  confidence: number;
};

export type ProblemNode = {
  id: string;
  label: string;
  kind: NodeKind;
  severity: Severity;
  volatility: number; // 0..1
  confidence: number; // 0..1
  description: string;
  tags: string[];
};

export type ProblemEdge = {
  id: string;
  from: string;
  to: string;
  relation: EdgeRelation;
  weight: number;
  confidence: number;
};

export type PatternInsight = {
  id: string;
  label: string;
  explanation: string;
  repetitionLikelihood: number; // 0..1
  coachingValue: number; // 0..1
  linkedNodeIds: string[];
};

export type FailureScenario = {
  id: string;
  label: string;
  triggerNodeIds: string[];
  consequenceNodeIds: string[];
  probability: number; // 0..1
  severity: number; // 0..1
  preventionActionHints: string[];
};

export type LeverageInsight = {
  id: string;
  label: string;
  targetNodeIds: string[];
  explanation: string;
  expectedImpact: number; // 0..1
  difficulty: number; // 0..1
  urgency: number; // 0..1
  compoundingValue: number; // 0..1
};

export type ActionCandidate = {
  id: string;
  title: string;
  type: 'milestone' | 'routine' | 'diagnostic' | 'constraint_fix' | 'skill_builder';
  description: string;
  durationDays: number;
  effort: number; // 0..1
  directTargets: string[];
  indirectTargets: string[];
  riskNodes: string[];
  unlockNodes: string[];
  repeatPerWeek?: number;
  minutesPerSession?: number;
  successSignals: string[];
};

export type PhasePlan = {
  id: string;
  title: string;
  rationale: string;
  actions: ActionCandidate[];
  targetNodeIds: string[];
  estimatedDays: number;
};

export type SearchPath = {
  phases: PhasePlan[];
  score: number;
  solvedNodeIds: string[];
  reducedNodeIds: string[];
  createdRisks: string[];
  explanation: string[];
};

export type MasterBlueprintInput = {
  goalTitle: string;
  domain: Domain;
  targetDateIso: string;
  difficultyLevel: number;
  weeklyHours: number;
  signals: GoalStateSignal[];
  userStyle?: {
    ambition: number; // 0..1
    perfectionism: number; // 0..1
    pressureTolerance: number; // 0..1
    consistency: number; // 0..1
  };
};

export type MasterBlueprintOutput = {
  inferredDomain: Domain;
  rootProblem: string;
  graph: {
    nodes: ProblemNode[];
    edges: ProblemEdge[];
  };
  patternInsights: PatternInsight[];
  leverageInsights: LeverageInsight[];
  failureScenarios: FailureScenario[];
  chosenPath: SearchPath;
  alternativePaths: SearchPath[];
  executionSteps: Array<{
    id: string;
    order: number;
    title: string;
    explanation: string;
    whyItMatters: string;
    estimatedDays: number;
    checklist: Array<{ id: string; label: string; done: boolean }>;
    linkedNodeIds: string[];
  }>;
  routines: Array<{
    id: string;
    title: string;
    reason: string;
    frequencyPerWeek: number;
    durationMinutes: number;
    linkedNodeIds: string[];
  }>;
  scoreBreakdown: {
    leverageScore: number;
    feasibilityScore: number;
    antiFailureScore: number;
    compoundingScore: number;
    totalScore: number;
  };
};

type PatternTemplate = {
  key: string;
  domain: Domain | 'all';
  triggerKeywords: string[];
  createNodes: Array<Omit<ProblemNode, 'id'>>;
  createEdges: Array<{
    fromLabel: string;
    toLabel: string;
    relation: EdgeRelation;
    weight: number;
    confidence: number;
  }>;
  createLeverage?: Array<{
    label: string;
    targetLabels: string[];
    explanation: string;
    expectedImpact: number;
    difficulty: number;
    urgency: number;
    compoundingValue: number;
  }>;
  createPatterns?: Array<{
    label: string;
    explanation: string;
    repetitionLikelihood: number;
    coachingValue: number;
    linkedLabels: string[];
  }>;
  createFailures?: Array<{
    label: string;
    triggerLabels: string[];
    consequenceLabels: string[];
    probability: number;
    severity: number;
    preventionActionHints: string[];
  }>;
  createActions?: Array<{
    title: string;
    type: 'milestone' | 'routine' | 'diagnostic' | 'constraint_fix' | 'skill_builder';
    description: string;
    durationDays: number;
    effort: number;
    directTargetLabels: string[];
    indirectTargetLabels: string[];
    riskLabels: string[];
    unlockLabels: string[];
    repeatPerWeek?: number;
    minutesPerSession?: number;
    successSignals: string[];
  }>;
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeText(input: string) {
  return input.trim().toLowerCase();
}

function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function daysUntil(targetDateIso: string) {
  const now = Date.now();
  const target = new Date(targetDateIso).getTime();
  if (!Number.isFinite(target)) return 90;
  return Math.max(1, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

function inferDomain(goalTitle: string, fallback: Domain): Domain {
  const g = normalizeText(goalTitle);

  if (g.includes('schach') || g.includes('elo')) return 'chess';

  if (
    g.includes('klavier') ||
    g.includes('gitarre') ||
    g.includes('violine') ||
    g.includes('mondscheinsonate') ||
    g.includes('beethoven') ||
    g.includes('musik')
  ) {
    return 'music';
  }

  if (
    g.includes('abnehmen') ||
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
    g.includes('prüfung') ||
    g.includes('lernen') ||
    g.includes('studium')
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

  if (g.includes('buch') || g.includes('roman') || g.includes('schreiben')) {
    return 'writing';
  }

  if (g.includes('projekt') || g.includes('app') || g.includes('produkt')) {
    return 'project';
  }

  return fallback;
}

function severityNumber(severity: Severity) {
  return severity;
}

function scoreNodeBase(node: ProblemNode) {
  return severityNumber(node.severity) * 0.6 + node.volatility * 2 + node.confidence;
}

function findNodeByLabel(nodes: ProblemNode[], label: string) {
  return nodes.find((n) => n.label === label);
}

function mapLabelsToNodeIds(labels: string[], nodes: ProblemNode[]) {
  return labels
    .map((label) => findNodeByLabel(nodes, label)?.id)
    .filter((id): id is string => typeof id === 'string');
}

function tokenizeSignals(signals: GoalStateSignal[]) {
  return signals
    .flatMap((signal) => [signal.key, String(signal.value)])
    .map(normalizeText)
    .join(' ');
}

const PATTERN_LIBRARY: PatternTemplate[] = [
  {
    key: 'chess_calculation_tree',
    domain: 'chess',
    triggerKeywords: ['schach', 'elo', '1800', '2000', 'berechnung', 'taktik'],
    createNodes: [
      {
        label: 'Hauptengpass: Rechen- und Entscheidungsqualität',
        kind: 'root_problem',
        severity: 5,
        volatility: 0.7,
        confidence: 0.92,
        description:
          'Nicht bloß fehlendes Wissen, sondern eine zu instabile Berechnungs- und Entscheidungsarchitektur blockiert den Ratinganstieg.',
        tags: ['chess', 'root'],
      },
      {
        label: 'Schwache Kandidatenzug-Disziplin',
        kind: 'skill_gap',
        severity: 5,
        volatility: 0.82,
        confidence: 0.9,
        description:
          'Der Nutzer prüft Kandidatenzüge nicht systematisch genug und rechnet dadurch ungleichmäßig.',
        tags: ['chess', 'calculation'],
      },
      {
        label: 'Conversion-Instabilität in besseren Stellungen',
        kind: 'execution_gap',
        severity: 4,
        volatility: 0.72,
        confidence: 0.86,
        description:
          'Vorteile werden nicht sauber technisch verwertet.',
        tags: ['chess', 'conversion'],
      },
      {
        label: 'Endspieltechnik lückenhaft',
        kind: 'knowledge_gap',
        severity: 4,
        volatility: 0.55,
        confidence: 0.82,
        description:
          'Vereinfachungs- und Endspielentscheidungen sind technisch zu unsicher.',
        tags: ['chess', 'endgame'],
      },
      {
        label: 'Musterkompression zu schwach',
        kind: 'pattern',
        severity: 4,
        volatility: 0.64,
        confidence: 0.8,
        description:
          'Wiederkehrende Motivfamilien werden nicht schnell genug erkannt.',
        tags: ['chess', 'patterns'],
      },
      {
        label: 'Zeitmanagement kollabiert in kritischen Stellungen',
        kind: 'failure_mode',
        severity: 4,
        volatility: 0.88,
        confidence: 0.8,
        description:
          'Unter Druck brechen Suchqualität und Priorisierung ein.',
        tags: ['chess', 'time'],
      },
      {
        label: 'Hebel: Kandidatenzugprozess erzwingen',
        kind: 'leverage_point',
        severity: 5,
        volatility: 0.2,
        confidence: 0.95,
        description:
          'Ein expliziter Kandidatenzugprozess reduziert Folgefehler in mehreren Bereichen gleichzeitig.',
        tags: ['chess', 'leverage'],
      },
    ],
    createEdges: [
      {
        fromLabel: 'Hauptengpass: Rechen- und Entscheidungsqualität',
        toLabel: 'Schwache Kandidatenzug-Disziplin',
        relation: 'reveals',
        weight: 0.9,
        confidence: 0.95,
      },
      {
        fromLabel: 'Schwache Kandidatenzug-Disziplin',
        toLabel: 'Conversion-Instabilität in besseren Stellungen',
        relation: 'causes',
        weight: 0.76,
        confidence: 0.9,
      },
      {
        fromLabel: 'Endspieltechnik lückenhaft',
        toLabel: 'Conversion-Instabilität in besseren Stellungen',
        relation: 'amplifies',
        weight: 0.7,
        confidence: 0.84,
      },
      {
        fromLabel: 'Musterkompression zu schwach',
        toLabel: 'Schwache Kandidatenzug-Disziplin',
        relation: 'amplifies',
        weight: 0.7,
        confidence: 0.82,
      },
      {
        fromLabel: 'Zeitmanagement kollabiert in kritischen Stellungen',
        toLabel: 'Schwache Kandidatenzug-Disziplin',
        relation: 'amplifies',
        weight: 0.8,
        confidence: 0.82,
      },
      {
        fromLabel: 'Hebel: Kandidatenzugprozess erzwingen',
        toLabel: 'Schwache Kandidatenzug-Disziplin',
        relation: 'solves',
        weight: 0.95,
        confidence: 0.95,
      },
    ],
    createLeverage: [
      {
        label: 'Kandidatenzug-Protokoll',
        targetLabels: ['Schwache Kandidatenzug-Disziplin'],
        explanation:
          'Ein strukturierter Suchprozess zwingt zu besserer Berechnung und reduziert Fehlerketten.',
        expectedImpact: 0.95,
        difficulty: 0.66,
        urgency: 0.95,
        compoundingValue: 0.92,
      },
      {
        label: 'Conversion-Training aus besseren Stellungen',
        targetLabels: ['Conversion-Instabilität in besseren Stellungen'],
        explanation:
          'Wer bessere Stellungen stabil gewinnt, hebt schnell das praktische Niveau.',
        expectedImpact: 0.88,
        difficulty: 0.72,
        urgency: 0.82,
        compoundingValue: 0.82,
      },
    ],
    createPatterns: [
      {
        label: 'Rechenbaum bricht an kritischem Verzweigungspunkt ab',
        explanation:
          'Nicht Blindheit, sondern zu frühes Stoppen der Varianten verursacht viele Fehler.',
        repetitionLikelihood: 0.86,
        coachingValue: 0.96,
        linkedLabels: ['Schwache Kandidatenzug-Disziplin'],
      },
      {
        label: 'Vorteile werden ohne technische Kontrolle wieder abgegeben',
        explanation:
          'Mehrere Bereiche leiden unter fehlender Konvertierungsroutine.',
        repetitionLikelihood: 0.8,
        coachingValue: 0.9,
        linkedLabels: ['Conversion-Instabilität in besseren Stellungen'],
      },
    ],
    createFailures: [
      {
        label: 'Zu viel Blitz, zu wenig Tiefenanalyse',
        triggerLabels: ['Zeitmanagement kollabiert in kritischen Stellungen'],
        consequenceLabels: [
          'Schwache Kandidatenzug-Disziplin',
          'Conversion-Instabilität in besseren Stellungen',
        ],
        probability: 0.72,
        severity: 0.78,
        preventionActionHints: [
          'Weniger oberflächliche Volumenreize',
          'Mehr tiefe Variantenanalyse',
          'Partien forensisch zerlegen',
        ],
      },
    ],
    createActions: [
      {
        title: 'Kandidatenzug-Protokoll auf 30 kritische Stellungen anwenden',
        type: 'milestone',
        description:
          'Jede Stellung mit 3 Kandidatenzügen, Gegnerantworten und forcing lines schriftlich lösen.',
        durationDays: 10,
        effort: 0.82,
        directTargetLabels: ['Schwache Kandidatenzug-Disziplin'],
        indirectTargetLabels: ['Hauptengpass: Rechen- und Entscheidungsqualität'],
        riskLabels: ['Zeitmanagement kollabiert in kritischen Stellungen'],
        unlockLabels: ['Conversion-Instabilität in besseren Stellungen'],
        successSignals: [
          'weniger taktische Grobfehler',
          'klarerer Denkprozess',
          'bessere Variantendisziplin',
        ],
      },
      {
        title: 'Conversion-Block aus besseren Stellungen',
        type: 'milestone',
        description:
          'Gewonnene oder bessere Stellungen systematisch ausspielen und technisch bewerten.',
        durationDays: 12,
        effort: 0.78,
        directTargetLabels: ['Conversion-Instabilität in besseren Stellungen'],
        indirectTargetLabels: ['Endspieltechnik lückenhaft'],
        riskLabels: [],
        unlockLabels: ['Hauptengpass: Rechen- und Entscheidungsqualität'],
        successSignals: [
          'mehr verwertete Vorteile',
          'ruhigere Vereinfachungsentscheidungen',
        ],
      },
      {
        title: 'Deep Calculation Routine',
        type: 'routine',
        description:
          '2 bis 4 Mal pro Woche wenige harte Stellungen komplett durchrechnen.',
        durationDays: 60,
        effort: 0.7,
        directTargetLabels: ['Schwache Kandidatenzug-Disziplin'],
        indirectTargetLabels: ['Musterkompression zu schwach'],
        riskLabels: [],
        unlockLabels: ['Hauptengpass: Rechen- und Entscheidungsqualität'],
        repeatPerWeek: 3,
        minutesPerSession: 50,
        successSignals: [
          'mehr Berechnungstiefe',
          'weniger frühe Variantenabbrüche',
        ],
      },
    ],
  },
  {
    key: 'moonlight_micro_skill_tree',
    domain: 'music',
    triggerKeywords: ['mondscheinsonate', 'klavier', 'beethoven', 'noten', 'stück'],
    createNodes: [
      {
        label: 'Hauptengpass: Stück wird nicht als Muster- und Mikroskill-System zerlegt',
        kind: 'root_problem',
        severity: 5,
        volatility: 0.82,
        confidence: 0.9,
        description:
          'Das Stück wird als Ganzes geübt statt in wiederkehrende Lesemuster, Bewegungsmuster und musikalische Teilprobleme zerlegt.',
        tags: ['music', 'root'],
      },
      {
        label: 'Notendekodierung zu langsam',
        kind: 'skill_gap',
        severity: 4,
        volatility: 0.72,
        confidence: 0.84,
        description:
          'Das Lesen und Zuordnen von Noten verbraucht zu viel kognitive Energie.',
        tags: ['music', 'note_reading'],
      },
      {
        label: 'Linke-Hand-Muster nicht gechunkt',
        kind: 'pattern',
        severity: 5,
        volatility: 0.66,
        confidence: 0.88,
        description:
          'Wiederkehrende Figuren werden nicht als Bausteine erkannt.',
        tags: ['music', 'left_hand'],
      },
      {
        label: 'Fingersatz-Instabilität',
        kind: 'execution_gap',
        severity: 4,
        volatility: 0.74,
        confidence: 0.82,
        description:
          'Instabiler Fingersatz verhindert Automatisierung.',
        tags: ['music', 'fingering'],
      },
      {
        label: 'Rhythmische Spannung ohne sauberen Puls',
        kind: 'failure_mode',
        severity: 3,
        volatility: 0.7,
        confidence: 0.78,
        description:
          'Tempo und Ausdruck kippen, weil Puls und Unterteilung nicht stabil genug sind.',
        tags: ['music', 'rhythm'],
      },
      {
        label: 'Hebel: Motiv- und Musterbibliothek aufbauen',
        kind: 'leverage_point',
        severity: 5,
        volatility: 0.2,
        confidence: 0.95,
        description:
          'Wer Musterfamilien erkennt, lernt das Stück nicht Ton für Ton.',
        tags: ['music', 'leverage'],
      },
    ],
    createEdges: [
      {
        fromLabel: 'Hauptengpass: Stück wird nicht als Muster- und Mikroskill-System zerlegt',
        toLabel: 'Linke-Hand-Muster nicht gechunkt',
        relation: 'causes',
        weight: 0.9,
        confidence: 0.94,
      },
      {
        fromLabel: 'Notendekodierung zu langsam',
        toLabel: 'Fingersatz-Instabilität',
        relation: 'amplifies',
        weight: 0.64,
        confidence: 0.8,
      },
      {
        fromLabel: 'Linke-Hand-Muster nicht gechunkt',
        toLabel: 'Rhythmische Spannung ohne sauberen Puls',
        relation: 'amplifies',
        weight: 0.62,
        confidence: 0.76,
      },
      {
        fromLabel: 'Hebel: Motiv- und Musterbibliothek aufbauen',
        toLabel: 'Linke-Hand-Muster nicht gechunkt',
        relation: 'solves',
        weight: 0.95,
        confidence: 0.95,
      },
    ],
    createLeverage: [
      {
        label: 'Muster-Chunks identifizieren',
        targetLabels: ['Linke-Hand-Muster nicht gechunkt'],
        explanation:
          'Wenn Bausteine statt Einzelnoten gelernt werden, steigt die Lerngeschwindigkeit massiv.',
        expectedImpact: 0.95,
        difficulty: 0.6,
        urgency: 0.92,
        compoundingValue: 0.94,
      },
    ],
    createPatterns: [
      {
        label: 'Wiederkehrende linke-Hand-Formen',
        explanation:
          'Viele scheinbar neue Passagen sind Varianten derselben Bewegungsstruktur.',
        repetitionLikelihood: 0.9,
        coachingValue: 0.95,
        linkedLabels: ['Linke-Hand-Muster nicht gechunkt'],
      },
    ],
    createFailures: [
      {
        label: 'Ganzes Stück zu früh im Zieltempo',
        triggerLabels: ['Rhythmische Spannung ohne sauberen Puls'],
        consequenceLabels: ['Fingersatz-Instabilität'],
        probability: 0.78,
        severity: 0.72,
        preventionActionHints: [
          'Abschnittsweise chunken',
          'Fingersatz fixieren',
          'Puls sichern, bevor Tempo steigt',
        ],
      },
    ],
    createActions: [
      {
        title: 'Musterkarte der ersten Seite erstellen',
        type: 'milestone',
        description:
          'Nicht Noten abschreiben, sondern Musterfamilien, Wiederholungen und Bewegungsgruppen markieren.',
        durationDays: 5,
        effort: 0.72,
        directTargetLabels: ['Linke-Hand-Muster nicht gechunkt'],
        indirectTargetLabels: ['Hauptengpass: Stück wird nicht als Muster- und Mikroskill-System zerlegt'],
        riskLabels: ['Rhythmische Spannung ohne sauberen Puls'],
        unlockLabels: ['Fingersatz-Instabilität'],
        successSignals: [
          'weniger Einzelnote-Denken',
          'schnellere Abschnittsaufnahme',
        ],
      },
      {
        title: 'Linke Hand isoliert in Chunk-Familien automatisieren',
        type: 'milestone',
        description:
          'Gruppiere wiederkehrende Bewegungsformen und trainiere sie getrennt.',
        durationDays: 9,
        effort: 0.8,
        directTargetLabels: ['Linke-Hand-Muster nicht gechunkt'],
        indirectTargetLabels: ['Fingersatz-Instabilität'],
        riskLabels: [],
        unlockLabels: ['Hauptengpass: Stück wird nicht als Muster- und Mikroskill-System zerlegt'],
        successSignals: [
          'mehr Stabilität',
          'weniger kognitive Überlastung',
        ],
      },
      {
        title: 'Notenlesen-Speed Routine',
        type: 'routine',
        description:
          'Tägliche kurze Dekodierungs- und Lesegeschwindigkeitsroutine.',
        durationDays: 50,
        effort: 0.48,
        directTargetLabels: ['Notendekodierung zu langsam'],
        indirectTargetLabels: ['Fingersatz-Instabilität'],
        riskLabels: [],
        unlockLabels: ['Linke-Hand-Muster nicht gechunkt'],
        repeatPerWeek: 6,
        minutesPerSession: 15,
        successSignals: [
          'schnelleres visuelles Erfassen',
          'weniger Stocken',
        ],
      },
    ],
  },
];

function buildBaseNodes(input: MasterBlueprintInput, inferredDomain: Domain): ProblemNode[] {
  const targetDays = daysUntil(input.targetDateIso);

  return [
    {
      id: uid('node'),
      label: `Ziel: ${input.goalTitle}`,
      kind: 'objective',
      severity: 5,
      volatility: 0.2,
      confidence: 1,
      description: 'Das Endziel des Systems.',
      tags: [inferredDomain, 'goal'],
    },
    {
      id: uid('node'),
      label: `Zeitfenster: ${targetDays} Tage`,
      kind: 'constraint',
      severity: targetDays < 60 ? 5 : targetDays < 120 ? 4 : 3,
      volatility: 0.12,
      confidence: 1,
      description:
        'Die Deadline beeinflusst Belastung, Reihenfolge und Priorisierung.',
      tags: [inferredDomain, 'time'],
    },
    {
      id: uid('node'),
      label: `Wochenkapazität: ${input.weeklyHours}h`,
      kind: 'resource',
      severity: input.weeklyHours < 4 ? 5 : input.weeklyHours < 8 ? 4 : 3,
      volatility: 0.22,
      confidence: 0.95,
      description:
        'Die verfügbare Wochenzeit begrenzt realistische Intensität und Suchbreite.',
      tags: [inferredDomain, 'resource'],
    },
  ];
}

function applyPatternLibrary(input: MasterBlueprintInput, inferredDomain: Domain) {
  const text = `${normalizeText(input.goalTitle)} ${tokenizeSignals(input.signals)}`;

  const matches = PATTERN_LIBRARY.filter((template) => {
    if (template.domain !== 'all' && template.domain !== inferredDomain) return false;
    return template.triggerKeywords.some((kw) => text.includes(normalizeText(kw)));
  });

  const nodes: ProblemNode[] = [];
  const edges: ProblemEdge[] = [];
  const leverageInsights: LeverageInsight[] = [];
  const patternInsights: PatternInsight[] = [];
  const failureScenarios: FailureScenario[] = [];
  const actionSeeds: ActionCandidate[] = [];

  for (const template of matches) {
    const createdNodes = template.createNodes.map((node) => ({ ...node, id: uid('node') }));
    nodes.push(...createdNodes);

    for (const edge of template.createEdges) {
      const from = findNodeByLabel(createdNodes, edge.fromLabel);
      const to = findNodeByLabel(createdNodes, edge.toLabel);
      if (!from || !to) continue;

      edges.push({
        id: uid('edge'),
        from: from.id,
        to: to.id,
        relation: edge.relation,
        weight: edge.weight,
        confidence: edge.confidence,
      });
    }

    for (const lev of template.createLeverage ?? []) {
      leverageInsights.push({
        id: uid('lev'),
        label: lev.label,
        targetNodeIds: mapLabelsToNodeIds(lev.targetLabels, createdNodes),
        explanation: lev.explanation,
        expectedImpact: lev.expectedImpact,
        difficulty: lev.difficulty,
        urgency: lev.urgency,
        compoundingValue: lev.compoundingValue,
      });
    }

    for (const pat of template.createPatterns ?? []) {
      patternInsights.push({
        id: uid('pat'),
        label: pat.label,
        explanation: pat.explanation,
        repetitionLikelihood: pat.repetitionLikelihood,
        coachingValue: pat.coachingValue,
        linkedNodeIds: mapLabelsToNodeIds(pat.linkedLabels, createdNodes),
      });
    }

    for (const failure of template.createFailures ?? []) {
      failureScenarios.push({
        id: uid('fail'),
        label: failure.label,
        triggerNodeIds: mapLabelsToNodeIds(failure.triggerLabels, createdNodes),
        consequenceNodeIds: mapLabelsToNodeIds(failure.consequenceLabels, createdNodes),
        probability: failure.probability,
        severity: failure.severity,
        preventionActionHints: failure.preventionActionHints,
      });
    }

    for (const action of template.createActions ?? []) {
      actionSeeds.push({
        id: uid('action'),
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
        successSignals: action.successSignals,
      });
    }
  }

  return {
    nodes,
    edges,
    leverageInsights,
    patternInsights,
    failureScenarios,
    actionSeeds,
  };
}

function buildGraph(input: MasterBlueprintInput, inferredDomain: Domain) {
  const baseNodes = buildBaseNodes(input, inferredDomain);
  const injected = applyPatternLibrary(input, inferredDomain);

  return {
    nodes: [...baseNodes, ...injected.nodes],
    edges: [...injected.edges],
    leverageInsights: [...injected.leverageInsights],
    patternInsights: [...injected.patternInsights],
    failureScenarios: [...injected.failureScenarios],
    actionSeeds: [...injected.actionSeeds],
  };
}

function pickRootProblem(nodes: ProblemNode) {
  return nodes;
}

function pickBestRootProblem(nodes: ProblemNode[]) {
  const roots = nodes.filter((n) => n.kind === 'root_problem');
  if (roots.length) {
    return [...roots].sort((a, b) => scoreNodeBase(b) - scoreNodeBase(a))[0];
  }
  return [...nodes].sort((a, b) => scoreNodeBase(b) - scoreNodeBase(a))[0];
}

function buildSyntheticActions(
  nodes: ProblemNode[],
  leverageInsights: LeverageInsight[],
  difficultyLevel: number,
): ActionCandidate[] {
  const sortedLeverage = [...leverageInsights].sort((a, b) => {
    const scoreA =
      (a.expectedImpact * a.urgency * (1 + a.compoundingValue)) /
      Math.max(a.difficulty, 0.1);
    const scoreB =
      (b.expectedImpact * b.urgency * (1 + b.compoundingValue)) /
      Math.max(b.difficulty, 0.1);
    return scoreB - scoreA;
  });

  const actions: ActionCandidate[] = [];

  for (const lev of sortedLeverage.slice(0, 6)) {
    actions.push({
      id: uid('action'),
      title: lev.label,
      type: 'milestone',
      description: lev.explanation,
      durationDays: difficultyLevel >= 8 ? 10 : 7,
      effort: clamp(lev.difficulty, 0.35, 0.95),
      directTargets: lev.targetNodeIds,
      indirectTargets: [],
      riskNodes: [],
      unlockNodes: lev.targetNodeIds,
      successSignals: [
        `Hebel aktiviert: ${lev.label}`,
        'mehr Systemstabilität',
      ],
    });
  }

  const highSeverity = [...nodes]
    .filter((n) =>
      ['skill_gap', 'knowledge_gap', 'execution_gap', 'failure_mode'].includes(n.kind),
    )
    .sort((a, b) => severityNumber(b.severity) - severityNumber(a.severity))
    .slice(0, 5);

  for (const node of highSeverity) {
    actions.push({
      id: uid('action'),
      title: `Engpass gezielt bearbeiten: ${node.label}`,
      type: node.kind === 'failure_mode' ? 'constraint_fix' : 'skill_builder',
      description: node.description,
      durationDays: 5 + node.severity,
      effort: clamp(0.35 + node.severity * 0.1, 0.4, 0.9),
      directTargets: [node.id],
      indirectTargets: [],
      riskNodes: [],
      unlockNodes: [node.id],
      successSignals: [`Node reduziert: ${node.label}`],
      repeatPerWeek: 2,
      minutesPerSession: 30 + node.severity * 5,
    });
  }

  return actions;
}

function scoreActionCandidate(
  action: ActionCandidate,
  nodes: ProblemNode[],
  failureScenarios: FailureScenario[],
  leverageInsights: LeverageInsight[],
  userStyle: MasterBlueprintInput['userStyle'],
) {
  const directNodes = nodes.filter((n) => action.directTargets.includes(n.id));
  const directSeverity = directNodes.reduce((sum, n) => sum + severityNumber(n.severity), 0);

  const matchingLeverage = leverageInsights.filter((l) =>
    l.targetNodeIds.some((id) => action.directTargets.includes(id)),
  );

  const leverageScore =
    directSeverity * 1.6 +
    matchingLeverage.reduce(
      (sum, l) => sum + l.expectedImpact * 5 + l.compoundingValue * 3,
      0,
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
  const precisionBonus =
    (action.directTargets.length + action.unlockNodes.length) * perfectionism * 0.9;
  const overloadPenalty =
    Math.max(0, action.effort - pressureTolerance) * (1.4 - consistency) * 4.8;

  return leverageScore + stretchBonus + precisionBonus - failurePenalty - overloadPenalty;
}

function buildPhasePlans(
  actionPool: ActionCandidate[],
  nodes: ProblemNode[],
  failureScenarios: FailureScenario[],
  leverageInsights: LeverageInsight[],
  input: MasterBlueprintInput,
): PhasePlan[] {
  const scored = actionPool
    .map((action) => ({
      action,
      score: scoreActionCandidate(
        action,
        nodes,
        failureScenarios,
        leverageInsights,
        input.userStyle,
      ),
    }))
    .sort((a, b) => b.score - a.score);

  const phases: PhasePlan[] = [];
  const chunkSize = 2;

  for (let i = 0; i < scored.length; i += chunkSize) {
    const slice = scored.slice(i, i + chunkSize).map((x) => x.action);
    if (!slice.length) continue;

    phases.push({
      id: uid('phase'),
      title: slice.length === 1 ? slice[0].title : `${slice[0].title} + ${slice[1].title}`,
      rationale:
        'Diese Phase bündelt Hebel mit hoher Downstream-Wirkung und guter Systemrelevanz.',
      actions: slice,
      targetNodeIds: Array.from(new Set(slice.flatMap((a) => a.directTargets))),
      estimatedDays: slice.reduce((sum, a) => sum + a.durationDays, 0),
    });
  }

  return phases;
}

function evaluatePath(
  phases: PhasePlan[],
  nodes: ProblemNode[],
  failureScenarios: FailureScenario[],
  leverageInsights: LeverageInsight[],
) {
  const targetedNodeIds = new Set(phases.flatMap((p) => p.targetNodeIds));
  const targetedNodes = nodes.filter((n) => targetedNodeIds.has(n.id));

  const leverageScore = targetedNodes.reduce(
    (sum, node) => sum + severityNumber(node.severity) * (1 + node.confidence),
    0,
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
    solvedNodeIds: targetedNodes.map((n) => n.id),
  };
}

function beamSearchPlans(
  phases: PhasePlan[],
  nodes: ProblemNode[],
  failureScenarios: FailureScenario[],
  leverageInsights: LeverageInsight[],
  beamWidth = 4,
  depth = 4,
): SearchPath[] {
  let frontier: SearchPath[] = [
    {
      phases: [],
      score: 0,
      solvedNodeIds: [],
      reducedNodeIds: [],
      createdRisks: [],
      explanation: ['Startzustand'],
    },
  ];

  for (let level = 0; level < depth; level += 1) {
    const nextFrontier: SearchPath[] = [];

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
          explanation: [...path.explanation, `Phase hinzugefügt: ${phase.title}`],
        });
      }
    }

    nextFrontier.sort((a, b) => b.score - a.score);
    frontier = nextFrontier.slice(0, beamWidth);

    if (!frontier.length) break;
  }

  return frontier.sort((a, b) => b.score - a.score);
}

function buildExecutionStepsFromPath(path: SearchPath) {
  return path.phases.map((phase, index) => ({
    id: uid('step'),
    order: index + 1,
    title: phase.title,
    explanation: phase.rationale,
    whyItMatters:
      'Diese Phase greift die stärksten Hebel zuerst an und erzeugt Folgewirkung auf spätere Probleme.',
    estimatedDays: phase.estimatedDays,
    checklist: phase.actions.slice(0, 4).map((action) => ({
      id: uid('check'),
      label: action.title,
      done: false,
    })),
    linkedNodeIds: phase.targetNodeIds,
  }));
}

function buildRoutinesFromActions(actions: ActionCandidate[]) {
  return actions
    .filter((action) => action.type === 'routine' || typeof action.repeatPerWeek === 'number')
    .slice(0, 8)
    .map((action) => ({
      id: uid('routine'),
      title: action.title,
      reason: action.description,
      frequencyPerWeek: action.repeatPerWeek ?? 3,
      durationMinutes: action.minutesPerSession ?? 35,
      linkedNodeIds: action.directTargets,
    }));
}

function ensureMinimumDepth(
  actions: ActionCandidate[],
  domain: Domain,
  rootProblem: ProblemNode | undefined,
): ActionCandidate[] {
  if (actions.length >= 6) return actions;

  const rootId = rootProblem?.id ? [rootProblem.id] : [];

  return [
    ...actions,
    {
      id: uid('action'),
      title: 'Root-Problem präzise isolieren',
      type: 'diagnostic',
      description:
        'Die Hauptengstelle muss scharf abgegrenzt werden, bevor weitere Phasen effizient werden.',
      durationDays: 4,
      effort: 0.58,
      directTargets: rootId,
      indirectTargets: [],
      riskNodes: [],
      unlockNodes: rootId,
      successSignals: ['Root Problem klarer', 'weniger generische Planung'],
    },
    {
      id: uid('action'),
      title: `Mikroskill-Tree in ${domain} aufbauen`,
      type: 'milestone',
      description:
        'Zerlege das Ziel in Teilfähigkeiten, damit Training nicht breit und ineffizient bleibt.',
      durationDays: 6,
      effort: 0.66,
      directTargets: rootId,
      indirectTargets: [],
      riskNodes: [],
      unlockNodes: rootId,
      successSignals: ['mehr Klarheit', 'bessere Hebelidentifikation'],
    },
  ];
}

export function generateMasterBlueprint(
  input: MasterBlueprintInput,
): MasterBlueprintOutput {
  const inferredDomain = inferDomain(input.goalTitle, input.domain);
  const graphBundle = buildGraph(input, inferredDomain);
  const rootProblemNode = pickBestRootProblem(graphBundle.nodes);

  const syntheticActions = buildSyntheticActions(
    graphBundle.nodes,
    graphBundle.leverageInsights,
    input.difficultyLevel,
  );

  const fullActionPool = ensureMinimumDepth(
    [...graphBundle.actionSeeds, ...syntheticActions],
    inferredDomain,
    rootProblemNode,
  );

  const phasePlans = buildPhasePlans(
    fullActionPool,
    graphBundle.nodes,
    graphBundle.failureScenarios,
    graphBundle.leverageInsights,
    input,
  );

  const searchPaths = beamSearchPlans(
    phasePlans,
    graphBundle.nodes,
    graphBundle.failureScenarios,
    graphBundle.leverageInsights,
    5,
    Math.min(5, Math.max(3, Math.ceil(input.difficultyLevel / 2))),
  );

  const chosenPath: SearchPath =
    searchPaths[0] ?? {
      phases: [],
      score: 0,
      solvedNodeIds: [],
      reducedNodeIds: [],
      createdRisks: [],
      explanation: ['Keine starke Pfadkombination gefunden.'],
    };

  const scoreBreakdownRaw = evaluatePath(
    chosenPath.phases,
    graphBundle.nodes,
    graphBundle.failureScenarios,
    graphBundle.leverageInsights,
  );

  const executionSteps = buildExecutionStepsFromPath(chosenPath);
  const routines = buildRoutinesFromActions(fullActionPool);

  return {
    inferredDomain,
    rootProblem:
      rootProblemNode?.description ||
      rootProblemNode?.label ||
      'Hauptproblem noch nicht tief genug identifiziert.',
    graph: {
      nodes: graphBundle.nodes,
      edges: graphBundle.edges,
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
      totalScore: Number(scoreBreakdownRaw.totalScore.toFixed(2)),
    },
  };
}