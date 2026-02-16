export interface BreakdownRange {
  start: number;
  end: number;
}

const OVERVIEW_HEADING = '【章節框架總覽】';
const TABLE_HEADING = '【逐章章節表】';
const RULES_HEADING = '【張力升級與去重守則】';

function extractSection(content: string, heading: string, nextHeadings: string[]): string {
  const startIndex = content.indexOf(heading);
  if (startIndex < 0) {
    return '';
  }
  const from = startIndex + heading.length;
  const to = nextHeadings
    .map((nextHeading) => content.indexOf(nextHeading, from))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  return content.slice(from, to ?? content.length).trim();
}

export function buildBreakdownRanges(
  chapterCount: number,
  chunkSize = 5
): BreakdownRange[] {
  const safeCount = Math.max(1, Math.floor(chapterCount));
  const safeChunkSize = Math.max(1, Math.floor(chunkSize));
  const ranges: BreakdownRange[] = [];
  for (let start = 1; start <= safeCount; start += safeChunkSize) {
    const end = Math.min(start + safeChunkSize - 1, safeCount);
    ranges.push({ start, end });
  }
  return ranges;
}

export function extractBreakdownMetaSections(content: string): {
  overview: string;
  rules: string;
} {
  const overview = extractSection(content, OVERVIEW_HEADING, [TABLE_HEADING, RULES_HEADING]);
  const rules = extractSection(content, RULES_HEADING, [TABLE_HEADING]);
  return { overview, rules };
}

export function normalizeBreakdownChunkContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith(TABLE_HEADING)) {
    return trimmed.slice(TABLE_HEADING.length).trim();
  }
  return trimmed;
}

export function composeBreakdownContent(input: {
  overview: string;
  chapterTable: string;
  rules: string;
}): string {
  return [
    OVERVIEW_HEADING,
    input.overview.trim() || '(未提供章節總覽)',
    '',
    TABLE_HEADING,
    input.chapterTable.trim() || '(未提供逐章內容)',
    '',
    RULES_HEADING,
    input.rules.trim() || '(未提供升級與去重守則)',
  ].join('\n');
}
