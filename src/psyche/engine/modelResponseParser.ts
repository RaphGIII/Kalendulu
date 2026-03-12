export type ParsedModelRecommendation = {
  realismVerdict: string;
  mainBottleneck: string;
  recommendations: string[];
  milestones: string[];
  scheduleAdvice?: string;
};

function safeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map((x) => x.trim()).filter(Boolean);
}

export function parseModelResponse(raw: unknown): ParsedModelRecommendation | null {
  if (!raw || typeof raw !== 'object') return null;

  const input = raw as Record<string, unknown>;

  const realismVerdict = safeString(input.realismVerdict);
  const mainBottleneck = safeString(input.mainBottleneck);
  const recommendations = safeStringArray(input.recommendations).slice(0, 5);
  const milestones = safeStringArray(input.milestones).slice(0, 8);
  const scheduleAdvice = safeString(input.scheduleAdvice);

  if (!realismVerdict && !mainBottleneck && recommendations.length === 0 && milestones.length === 0) {
    return null;
  }

  return {
    realismVerdict: realismVerdict || 'Keine klare Modellbewertung',
    mainBottleneck: mainBottleneck || 'Kein klarer Engpass erkannt',
    recommendations:
      recommendations.length > 0
        ? recommendations
        : ['Plan enger strukturieren', 'Engpass zuerst bearbeiten', 'Umsetzung wöchentlich überprüfen'],
    milestones:
      milestones.length > 0
        ? milestones
        : ['Start klarziehen', 'Rhythmus aufbauen', 'Fortschritt stabilisieren', 'Ziel erreichen'],
    scheduleAdvice: scheduleAdvice || undefined,
  };
}

export function parseModelResponseFromText(text: string): ParsedModelRecommendation | null {
  if (!text.trim()) return null;

  return {
    realismVerdict: 'Textantwort erkannt',
    mainBottleneck: 'Muss noch weiter strukturiert werden',
    recommendations: [text.trim()].slice(0, 1),
    milestones: [],
  };
}