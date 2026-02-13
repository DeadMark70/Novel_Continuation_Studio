import { DEFAULT_PROMPTS } from './prompts';
import type {
  CharacterTimelineEntry,
  ConsistencyCategory,
  ConsistencyCheckInput,
  ConsistencyCheckResult,
  ConsistencyIssue,
  ConsistencyReport,
  ConsistencySeverity,
  ForeshadowEntry,
  ForeshadowStatus,
} from './consistency-types';

const OPEN_FORESHADOW_KEYWORDS = ['伏筆', '秘密', '線索', '遲早', '總有一天', '約定', '承諾', '謎', '真相'];
const RESOLVED_FORESHADOW_KEYWORDS = ['揭曉', '真相大白', '回收', '兌現', '完成', '解開', '答案'];
const CONTRADICTED_FORESHADOW_KEYWORDS = ['推翻', '自相矛盾', '前後不符', '與之前不同', '不是這樣'];
const COMMON_NON_NAME_TOKENS = new Set([
  '但是',
  '如果',
  '因為',
  '所以',
  '這個',
  '那個',
  '自己',
  '我們',
  '你們',
  '他們',
  '她們',
  '主角',
  '故事',
  '章節',
  '場景',
  '角色',
  '小說',
  '情節',
  '心理',
  '關係',
  '對話',
  '風格',
  '伏筆',
  '證據',
  '上下文',
]);

interface RuleCheckResult {
  issues: ConsistencyIssue[];
  characterTimelineUpdates: CharacterTimelineEntry[];
  foreshadowLedger: ForeshadowEntry[];
}

interface ParsedLlmPayload {
  summary?: string;
  issues?: Array<{
    category?: unknown;
    severity?: unknown;
    title?: unknown;
    evidence?: unknown;
    suggestion?: unknown;
  }>;
  characterUpdates?: Array<{
    character?: unknown;
    change?: unknown;
    evidence?: unknown;
  }>;
  foreshadowUpdates?: Array<{
    title?: unknown;
    status?: unknown;
    evidence?: unknown;
  }>;
}

interface ForeshadowUpdateCandidate {
  title: string;
  status: ForeshadowStatus;
  evidence?: string;
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitSentences(text: string): string[] {
  return text
    .split(/[\n。！？!?]+/g)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length > 0);
}

function parseNumericToken(token: string): number | null {
  if (/^\d+$/.test(token)) {
    const parsed = Number.parseInt(token, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const numerals: Record<string, number> = {
    零: 0,
    一: 1,
    二: 2,
    兩: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };

  let result = 0;
  let temp = 0;
  const normalized = token.trim();

  for (const char of normalized) {
    if (char === '百') {
      const base = temp === 0 ? 1 : temp;
      result += base * 100;
      temp = 0;
      continue;
    }
    if (char === '十') {
      const base = temp === 0 ? 1 : temp;
      result += base * 10;
      temp = 0;
      continue;
    }
    const numeral = numerals[char];
    if (numeral === undefined) {
      return null;
    }
    temp = numeral;
  }

  result += temp;
  return result > 0 ? result : null;
}

function extractDayMarkers(text: string): number[] {
  const markers: number[] = [];
  const pattern = /第\s*([0-9]{1,3}|[零一二兩三四五六七八九十百]{1,4})\s*天/g;
  let match: RegExpExecArray | null = pattern.exec(text);

  while (match) {
    const value = parseNumericToken(match[1]);
    if (value !== null) {
      markers.push(value);
    }
    match = pattern.exec(text);
  }

  return markers;
}

function extractChapterNumberFromText(chapterText: string, fallback: number): number {
  const match = chapterText.match(/第\s*([0-9]{1,3}|[零一二兩三四五六七八九十百]{1,4})\s*章/);
  if (!match) {
    return fallback;
  }
  return parseNumericToken(match[1]) ?? fallback;
}

function normalizeForeshadowKey(title: string): string {
  return title.replace(/\s+/g, '').replace(/[，。,.!?！？:：;；"'`~\-]/g, '').toLowerCase();
}

function isLikelyCharacterName(name: string): boolean {
  const normalized = name.trim();
  if (!normalized || normalized.length > 20) {
    return false;
  }
  if (normalized.length < 2) {
    return false;
  }
  const blocked = [
    '姓名',
    '稱呼',
    '角色',
    '核心慾望',
    '弱點',
    '關係網',
    '成長弧',
    '不可改設定',
    '身分',
    '身份',
  ];
  return !blocked.some((token) => normalized.includes(token));
}

function extractCharacterNames(characterCards: string): string[] {
  if (!characterCards.trim()) {
    return [];
  }

  const names = new Set<string>();
  const lines = characterCards.split('\n').map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const keyValueName = line.match(/^(?:[-*]\s*)?([^:：]{1,24})[:：]/);
    if (keyValueName) {
      const candidate = keyValueName[1].replace(/^[\d\.\)\(\-\s]+/g, '').trim();
      if (isLikelyCharacterName(candidate)) {
        names.add(candidate);
      }
    }

    const semanticName = line.match(/(?:姓名|名字|稱呼|角色|Name)\s*[:：]\s*([^\s,，/|]{1,20})/i);
    if (semanticName) {
      const candidate = semanticName[1].trim();
      if (isLikelyCharacterName(candidate)) {
        names.add(candidate);
      }
    }
  }

  return Array.from(names).slice(0, 16);
}

function countMentions(text: string, token: string): number {
  if (!token.trim()) {
    return 0;
  }
  const pattern = new RegExp(escapeRegExp(token), 'g');
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function extractUnknownFrequentNameCandidates(text: string, knownNames: string[]): string[] {
  const tokens = text.match(/[A-Z][a-zA-Z]{2,}|[\u4e00-\u9fff]{2,4}/g) ?? [];
  const frequencies = new Map<string, number>();

  for (const token of tokens) {
    if (COMMON_NON_NAME_TOKENS.has(token)) {
      continue;
    }
    if (knownNames.some((known) => known.includes(token) || token.includes(known))) {
      continue;
    }
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  return Array.from(frequencies.entries())
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token)
    .slice(0, 5);
}

function inferForeshadowStatus(sentence: string): ForeshadowStatus | null {
  if (CONTRADICTED_FORESHADOW_KEYWORDS.some((keyword) => sentence.includes(keyword))) {
    return 'contradicted';
  }
  if (RESOLVED_FORESHADOW_KEYWORDS.some((keyword) => sentence.includes(keyword))) {
    return 'resolved';
  }
  if (OPEN_FORESHADOW_KEYWORDS.some((keyword) => sentence.includes(keyword))) {
    return 'open';
  }
  return null;
}

function extractForeshadowUpdatesFromChapter(chapterText: string): ForeshadowUpdateCandidate[] {
  const updates: ForeshadowUpdateCandidate[] = [];
  const sentences = splitSentences(chapterText);

  for (const sentence of sentences) {
    const status = inferForeshadowStatus(sentence);
    if (!status) {
      continue;
    }

    const title = truncateText(sentence, 36);
    updates.push({
      title,
      status,
      evidence: truncateText(sentence, 140),
    });

    if (updates.length >= 6) {
      break;
    }
  }

  return updates;
}

function mergeForeshadowLedger(
  previous: ForeshadowEntry[],
  updates: ForeshadowUpdateCandidate[],
  chapterNumber: number
): ForeshadowEntry[] {
  const ledger = [...previous];

  for (const update of updates) {
    const updateKey = normalizeForeshadowKey(update.title);
    const existingIndex = ledger.findIndex((entry) => {
      const existingKey = normalizeForeshadowKey(entry.title);
      return existingKey === updateKey || existingKey.includes(updateKey) || updateKey.includes(existingKey);
    });

    if (existingIndex >= 0) {
      const existing = ledger[existingIndex];
      ledger[existingIndex] = {
        ...existing,
        status: update.status,
        evidence: update.evidence ?? existing.evidence,
        lastUpdatedChapter: chapterNumber,
      };
      continue;
    }

    ledger.push({
      id: createId('foreshadow'),
      title: update.title,
      status: update.status,
      evidence: update.evidence,
      introducedAtChapter: chapterNumber,
      lastUpdatedChapter: chapterNumber,
    });
  }

  return ledger.slice(-120);
}

function buildCharacterTimelineUpdates(
  latestChapterText: string,
  chapterNumber: number,
  knownNames: string[]
): CharacterTimelineEntry[] {
  const sentences = splitSentences(latestChapterText);
  const updates: CharacterTimelineEntry[] = [];

  for (const name of knownNames) {
    if (countMentions(latestChapterText, name) === 0) {
      continue;
    }

    const evidence = sentences.find((sentence) => sentence.includes(name));
    const change = evidence
      ? truncateText(evidence, 96)
      : `${name} 在本章有新的行動或心理狀態變化。`;

    updates.push({
      id: createId('timeline'),
      chapterNumber,
      character: name,
      change,
      evidence: evidence ? truncateText(evidence, 140) : undefined,
      updatedAt: Date.now(),
    });
  }

  return updates.slice(0, 10);
}

function createIssue(params: {
  category: ConsistencyCategory;
  severity: ConsistencySeverity;
  title: string;
  evidence: string;
  suggestion: string;
  source: 'rule' | 'llm';
}): ConsistencyIssue {
  return {
    id: createId('issue'),
    category: params.category,
    severity: params.severity,
    title: params.title,
    evidence: truncateText(normalizeWhitespace(params.evidence), 220),
    suggestion: truncateText(normalizeWhitespace(params.suggestion), 220),
    source: params.source,
  };
}

function dedupeIssues(issues: ConsistencyIssue[]): ConsistencyIssue[] {
  const seen = new Set<string>();
  const deduped: ConsistencyIssue[] = [];

  for (const issue of issues) {
    const key = `${issue.category}|${issue.severity}|${issue.title}|${issue.evidence}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(issue);
  }

  return deduped;
}

function runRuleChecks(input: ConsistencyCheckInput): RuleCheckResult {
  const chapterNumber = extractChapterNumberFromText(input.latestChapterText, input.chapterNumber);
  const knownNames = extractCharacterNames(input.characterCards);
  const issues: ConsistencyIssue[] = [];

  if (knownNames.length > 0) {
    const mentionedKnownCount = knownNames.filter((name) => countMentions(input.latestChapterText, name) > 0).length;
    if (mentionedKnownCount === 0) {
      issues.push(createIssue({
        category: 'character',
        severity: 'medium',
        title: '本章未提及既有角色卡人物',
        evidence: `角色卡已建檔 ${knownNames.length} 位角色，但最新章節沒有明確提及任何一位。`,
        suggestion: '確認本章是否有意切換視角，若否請補回與主角色群的連結。',
        source: 'rule',
      }));
    }
  }

  const unknownCandidates = extractUnknownFrequentNameCandidates(input.latestChapterText, knownNames);
  if (unknownCandidates.length > 0) {
    issues.push(createIssue({
      category: 'naming',
      severity: 'low',
      title: '可能出現未建檔稱呼',
      evidence: `本章高頻稱呼：${unknownCandidates.join('、')}`,
      suggestion: '確認這些稱呼是否為新角色；若是，更新角色卡或補充稱呼對照。',
      source: 'rule',
    }));
  }

  const previousChapters = input.allChapters.slice(0, Math.max(0, input.allChapters.length - 1)).join('\n');
  const prevDays = extractDayMarkers(previousChapters);
  const currentDays = extractDayMarkers(input.latestChapterText);
  if (prevDays.length > 0 && currentDays.length > 0) {
    const maxPrevDay = Math.max(...prevDays);
    const minCurrentDay = Math.min(...currentDays);
    if (minCurrentDay < maxPrevDay) {
      issues.push(createIssue({
        category: 'timeline',
        severity: 'high',
        title: '時間線可能倒退',
        evidence: `前文最高天數為第 ${maxPrevDay} 天，但本章出現第 ${minCurrentDay} 天。`,
        suggestion: '檢查是否為回憶段落；若不是，請調整時間標記使其單調遞增。',
        source: 'rule',
      }));
    }
  }

  const extractedForeshadowUpdates = extractForeshadowUpdatesFromChapter(input.latestChapterText);
  const foreshadowLedger = mergeForeshadowLedger(
    input.previousForeshadowLedger ?? [],
    extractedForeshadowUpdates,
    chapterNumber
  );
  const staleOpenForeshadow = foreshadowLedger.filter(
    (entry) => entry.status === 'open' && chapterNumber - entry.lastUpdatedChapter >= 3
  );
  if (staleOpenForeshadow.length > 0) {
    issues.push(createIssue({
      category: 'foreshadow',
      severity: 'low',
      title: '有長期未回收伏筆',
      evidence: staleOpenForeshadow.slice(0, 3).map((entry) => entry.title).join(' / '),
      suggestion: '可在下一章安排輕量回收或再度提及，避免讀者失去記憶鏈接。',
      source: 'rule',
    }));
  }

  const contradictedForeshadow = foreshadowLedger.filter((entry) => entry.status === 'contradicted');
  if (contradictedForeshadow.length > 0) {
    issues.push(createIssue({
      category: 'foreshadow',
      severity: 'high',
      title: '伏筆狀態出現矛盾訊號',
      evidence: contradictedForeshadow.slice(0, 2).map((entry) => entry.title).join(' / '),
      suggestion: '確認該伏筆是否真的被推翻，必要時補一句解釋以維持敘事合理性。',
      source: 'rule',
    }));
  }

  return {
    issues: dedupeIssues(issues),
    characterTimelineUpdates: buildCharacterTimelineUpdates(input.latestChapterText, chapterNumber, knownNames),
    foreshadowLedger,
  };
}

function normalizeCategory(value: unknown): ConsistencyCategory | null {
  if (typeof value !== 'string') {
    return null;
  }
  if (
    value === 'character' ||
    value === 'timeline' ||
    value === 'naming' ||
    value === 'foreshadow' ||
    value === 'style_drift' ||
    value === 'repetition' ||
    value === 'erotic_drift' ||
    value === 'erotic_repetition' ||
    value === 'boundary_mismatch'
  ) {
    return value;
  }
  return null;
}

function normalizeSeverity(value: unknown): ConsistencySeverity {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}

function normalizeForeshadowStatus(value: unknown): ForeshadowStatus | null {
  if (value === 'open' || value === 'resolved' || value === 'contradicted') {
    return value;
  }
  return null;
}

function parseJsonFromText(rawOutput: string): ParsedLlmPayload | null {
  const fenced = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = (fenced ? fenced[1] : rawOutput).trim();
  const firstBrace = source.indexOf('{');
  const lastBrace = source.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = source.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(candidate) as ParsedLlmPayload;
  } catch {
    return null;
  }
}

function applyLlmForeshadowUpdates(
  ledger: ForeshadowEntry[],
  updates: ParsedLlmPayload['foreshadowUpdates'],
  chapterNumber: number
): ForeshadowEntry[] {
  if (!updates || updates.length === 0) {
    return ledger;
  }

  const normalized: ForeshadowUpdateCandidate[] = [];
  for (const update of updates) {
    const title = typeof update.title === 'string' ? normalizeWhitespace(update.title) : '';
    const status = normalizeForeshadowStatus(update.status);
    if (!title || !status) {
      continue;
    }
    normalized.push({
      title: truncateText(title, 60),
      status,
      evidence: typeof update.evidence === 'string' ? truncateText(normalizeWhitespace(update.evidence), 140) : undefined,
    });
  }

  if (normalized.length === 0) {
    return ledger;
  }
  return mergeForeshadowLedger(ledger, normalized, chapterNumber);
}

function parseLlmIssues(payload: ParsedLlmPayload): ConsistencyIssue[] {
  if (!payload.issues || payload.issues.length === 0) {
    return [];
  }

  const parsed: ConsistencyIssue[] = [];
  for (const issue of payload.issues) {
    const category = normalizeCategory(issue.category);
    const title = typeof issue.title === 'string' ? normalizeWhitespace(issue.title) : '';
    const evidence = typeof issue.evidence === 'string' ? normalizeWhitespace(issue.evidence) : '';
    const suggestion = typeof issue.suggestion === 'string' ? normalizeWhitespace(issue.suggestion) : '';
    if (!category || !title || !evidence || !suggestion) {
      continue;
    }

    parsed.push(createIssue({
      category,
      severity: normalizeSeverity(issue.severity),
      title,
      evidence,
      suggestion,
      source: 'llm',
    }));
  }

  return parsed;
}

function parseLlmCharacterUpdates(
  payload: ParsedLlmPayload,
  chapterNumber: number
): CharacterTimelineEntry[] {
  if (!payload.characterUpdates || payload.characterUpdates.length === 0) {
    return [];
  }

  const updates: CharacterTimelineEntry[] = [];
  for (const update of payload.characterUpdates) {
    const character = typeof update.character === 'string' ? normalizeWhitespace(update.character) : '';
    const change = typeof update.change === 'string' ? normalizeWhitespace(update.change) : '';
    if (!character || !change) {
      continue;
    }
    const evidence = typeof update.evidence === 'string' ? truncateText(normalizeWhitespace(update.evidence), 140) : undefined;
    updates.push({
      id: createId('timeline'),
      chapterNumber,
      character: truncateText(character, 20),
      change: truncateText(change, 120),
      evidence,
      updatedAt: Date.now(),
    });
  }

  return updates.slice(0, 12);
}

function formatChapters(chapters: string[]): string {
  if (chapters.length === 0) {
    return '（無）';
  }
  return chapters.map((chapter, index) => `【第 ${index + 1} 章】\n${chapter}`).join('\n\n---\n\n');
}

function formatForeshadowLedger(entries: ForeshadowEntry[]): string {
  if (entries.length === 0) {
    return '（無）';
  }
  return entries
    .slice(-20)
    .map((entry) => `- ${entry.title} | status=${entry.status} | chapter=${entry.lastUpdatedChapter}`)
    .join('\n');
}

function injectConsistencyPrompt(template: string, input: ConsistencyCheckInput): string {
  const replacements: Record<string, string> = {
    '{{CHARACTER_CARDS}}': input.characterCards || '',
    '{{STYLE_GUIDE}}': input.styleGuide || '',
    '{{COMPRESSION_OUTLINE}}': input.compressionOutline || '',
    '{{EVIDENCE_PACK}}': input.evidencePack || '',
    '{{EROTIC_PACK}}': input.eroticPack || '',
    '{{COMPRESSED_CONTEXT}}': input.compressedContext || '',
    '{{LATEST_CHAPTER}}': input.latestChapterText || '',
    '{{ALL_CHAPTERS}}': formatChapters(input.allChapters || []),
    '{{PREVIOUS_FORESHADOW_LEDGER}}': formatForeshadowLedger(input.previousForeshadowLedger ?? []),
    '{{TARGET_CHAPTER_NUMBER}}': input.chapterNumber.toString(),
  };

  let output = template;
  for (const [placeholder, value] of Object.entries(replacements)) {
    output = output.split(placeholder).join(value);
  }
  return output;
}

function buildSummaryText(chapterNumber: number, issues: ConsistencyIssue[], openForeshadowCount: number): string {
  if (issues.length === 0) {
    return `第 ${chapterNumber} 章一致性檢查完成，未發現明確衝突。`;
  }
  const highCount = issues.filter((issue) => issue.severity === 'high').length;
  return `第 ${chapterNumber} 章檢查完成：${issues.length} 個問題（高風險 ${highCount}），未回收伏筆 ${openForeshadowCount} 個。`;
}

export function buildRegenPromptDraft(report: Pick<ConsistencyReport, 'chapterNumber' | 'issues'>): string {
  const relevantIssues = report.issues
    .filter((issue) => issue.severity === 'high' || issue.severity === 'medium')
    .slice(0, 6);

  if (relevantIssues.length === 0) {
    return `請重讀第 ${report.chapterNumber} 章，維持原文風格並做輕量潤飾，避免新增重大事件。`;
  }

  const issueLines = relevantIssues
    .map((issue, index) => `${index + 1}. [${issue.category}/${issue.severity}] ${issue.title}\n   - 證據：${issue.evidence}\n   - 修正：${issue.suggestion}`)
    .join('\n');

  return [
    `請重寫第 ${report.chapterNumber} 章，目標是修正一致性問題但不改變主線事件。`,
    '',
    '必修問題：',
    issueLines,
    '',
    '硬性限制：',
    '- 不新增原文不存在的重大事件。',
    '- 角色卡的人設與稱呼必須維持一致。',
    '- 若需補伏筆，僅允許用一到兩句自然回收，不要重開新線。',
    '',
    '輸出：只回傳重寫後章節正文。',
  ].join('\n');
}

export async function runConsistencyCheck(input: ConsistencyCheckInput): Promise<ConsistencyCheckResult> {
  const chapterNumber = extractChapterNumberFromText(input.latestChapterText, input.chapterNumber);
  const ruleResult = runRuleChecks({
    ...input,
    chapterNumber,
  });

  let mergedIssues = [...ruleResult.issues];
  let mergedTimeline = [...ruleResult.characterTimelineUpdates];
  let mergedForeshadowLedger = [...ruleResult.foreshadowLedger];
  let llmSummary: string | undefined;

  if (input.llmCheck) {
    const template = input.promptTemplate || DEFAULT_PROMPTS.consistency;
    const prompt = injectConsistencyPrompt(template, input);
    try {
      const llmRaw = await input.llmCheck(prompt);
      const parsed = parseJsonFromText(llmRaw);

      if (!parsed) {
        mergedIssues.push(createIssue({
          category: 'naming',
          severity: 'low',
          title: '一致性模型輸出格式異常',
          evidence: 'LLM checker 沒有回傳可解析的 JSON。',
          suggestion: '檢查 Consistency Prompt Template，並要求模型只輸出 JSON。',
          source: 'rule',
        }));
      } else {
        llmSummary = typeof parsed.summary === 'string' ? normalizeWhitespace(parsed.summary) : undefined;
        mergedIssues = mergedIssues.concat(parseLlmIssues(parsed));
        mergedTimeline = mergedTimeline.concat(parseLlmCharacterUpdates(parsed, chapterNumber));
        mergedForeshadowLedger = applyLlmForeshadowUpdates(
          mergedForeshadowLedger,
          parsed.foreshadowUpdates,
          chapterNumber
        );
      }
    } catch (error) {
      mergedIssues.push(createIssue({
        category: 'timeline',
        severity: 'low',
        title: '一致性模型呼叫失敗',
        evidence: error instanceof Error ? error.message : 'Unknown error',
        suggestion: '目前已保留規則檢查結果；稍後可重跑 LLM 檢查。',
        source: 'rule',
      }));
    }
  }

  mergedIssues = dedupeIssues(mergedIssues);
  mergedTimeline = mergedTimeline.sort((a, b) => a.updatedAt - b.updatedAt).slice(-200);
  mergedForeshadowLedger = mergedForeshadowLedger.slice(-120);

  const now = Date.now();
  const openForeshadowCount = mergedForeshadowLedger.filter((entry) => entry.status === 'open').length;
  const highRiskCount = mergedIssues.filter((issue) => issue.severity === 'high').length;
  const summaryText = llmSummary || buildSummaryText(chapterNumber, mergedIssues, openForeshadowCount);

  const report: ConsistencyReport = {
    id: createId('consistency_report'),
    chapterNumber,
    generatedAt: now,
    summary: summaryText,
    issues: mergedIssues,
    regenPromptDraft: '',
  };
  report.regenPromptDraft = buildRegenPromptDraft(report);

  return {
    report,
    characterTimelineUpdates: mergedTimeline,
    foreshadowLedger: mergedForeshadowLedger,
    summary: {
      latestChapter: chapterNumber,
      totalIssues: mergedIssues.length,
      highRiskCount,
      openForeshadowCount,
      lastCheckedAt: now,
    },
  };
}
