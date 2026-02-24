const RECENT_SENSORY_TEMPLATE_IDS_LIMIT = 4;
const recentSensoryTemplateIdsBySession = new Map<string, string[]>();

export function getRecentSensoryTemplateIds(sessionId: string): string[] {
  if (!sessionId) {
    return [];
  }
  return recentSensoryTemplateIdsBySession.get(sessionId) ?? [];
}

export function pushRecentSensoryTemplateIds(sessionId: string, ids: string[]): void {
  if (!sessionId || ids.length === 0) {
    return;
  }
  const current = getRecentSensoryTemplateIds(sessionId);
  const merged = [...current, ...ids.map((entry) => entry.trim()).filter(Boolean)];
  const deduped = [...new Set(merged)].slice(-RECENT_SENSORY_TEMPLATE_IDS_LIMIT);
  recentSensoryTemplateIdsBySession.set(sessionId, deduped);
}
