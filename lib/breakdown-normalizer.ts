const OVERVIEW_HEADING = '【章節框架總覽】';
const TABLE_HEADING = '【逐章章節表】';
const RULES_HEADING = '【張力升級與去重守則】';
const TAG_HEADING = '【推薦感官標籤】';
const POV_HEADING = '【感官視角重心】';

const HEADING_DIVIDER_RE = /^\s*[-=*#]{3,}\s*$/u;
const MARKDOWN_DECORATOR_RE = /^[\s>*#`*_~-]+|[\s>*#`*_~-]+$/gu;

const CHINESE_DIGIT_MAP: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  兩: 2,
  两: 2,
};

export interface BreakdownChapterBlock {
  chapterNumber: number;
  heading: string;
  content: string;
  start: number;
  end: number;
}

export interface BreakdownNormalizationReport {
  normalized: boolean;
  chapterHeadingFixes: number;
  sectionHeadingFixes: number;
  fieldHeadingFixes: number;
  chineseNumeralConversions: number;
  removedDividerLines: number;
}

export interface BreakdownNormalizationResult {
  content: string;
  report: BreakdownNormalizationReport;
}

function toHalfWidthDigits(input: string): string {
  return input.replace(/[０-９]/g, (value) => String.fromCharCode(value.charCodeAt(0) - 0xfee0));
}

export function parseChineseNumeralToInt(value: string): number | null {
  const source = value.trim();
  if (!source) {
    return null;
  }
  const normalizedDigits = toHalfWidthDigits(source);
  if (/^\d+$/u.test(normalizedDigits)) {
    return Number.parseInt(normalizedDigits, 10);
  }

  // Supports up to 99; sufficient for chapter ranges in this app.
  const chars = [...normalizedDigits];
  if (chars.some((char) => !(char in CHINESE_DIGIT_MAP))) {
    return null;
  }

  if (chars.length === 1) {
    const single = CHINESE_DIGIT_MAP[chars[0]];
    return Number.isFinite(single) ? single : null;
  }

  const token = chars.join('');
  if (token === '十') {
    return 10;
  }
  if (token.startsWith('十')) {
    const ones = CHINESE_DIGIT_MAP[token[1]] ?? 0;
    return 10 + ones;
  }
  if (token.includes('十')) {
    const [left, right] = token.split('十');
    const tens = CHINESE_DIGIT_MAP[left] ?? 0;
    const ones = right ? (CHINESE_DIGIT_MAP[right] ?? 0) : 0;
    return (tens * 10) + ones;
  }

  return null;
}

function cleanupLine(line: string): string {
  return line
    .replace(/\u3000/g, ' ')
    .replace(/\t/g, ' ')
    .trim();
}

function cleanupHeadingCandidate(line: string): string {
  return cleanupLine(line).replace(MARKDOWN_DECORATOR_RE, '').trim();
}

function normalizeSectionHeading(line: string): string | null {
  const candidate = cleanupHeadingCandidate(line);
  if (!candidate) {
    return null;
  }
  if (candidate.includes('章節框架總覽')) {
    return OVERVIEW_HEADING;
  }
  if (candidate.includes('逐章章節表')) {
    return TABLE_HEADING;
  }
  if (candidate.includes('張力升級與去重守則')) {
    return RULES_HEADING;
  }
  return null;
}

function normalizeFieldHeading(line: string): string | null {
  const candidate = cleanupHeadingCandidate(line);
  if (!candidate) {
    return null;
  }
  const normalized = candidate.replace(/\s+/g, '');
  if (/(推薦|推荐)感官標籤/u.test(normalized) || /(推薦|推荐)感官标签/u.test(normalized)) {
    const match = candidate.match(/[:：](.*)$/u) || candidate.match(/】\s*(.+)$/u);
    const value = match?.[1]?.trim();
    return value ? `${TAG_HEADING}${value}` : TAG_HEADING;
  }
  if (/感官視角重心/u.test(normalized) || /感官视角重心/u.test(normalized)) {
    const match = candidate.match(/[:：](.*)$/u) || candidate.match(/】\s*(.+)$/u);
    const value = match?.[1]?.trim();
    return value ? `${POV_HEADING}${value}` : POV_HEADING;
  }
  return null;
}

function parseChapterHeading(line: string): {
  chapterNumber: number;
  title?: string;
  usedChineseNumeral: boolean;
} | null {
  const candidate = cleanupHeadingCandidate(line);
  if (!candidate) {
    return null;
  }

  const match = candidate.match(
    /^(?:【\s*)?第\s*([0-9０-９一二三四五六七八九十兩两〇零]+)\s*章(?:\s*(?:[】]|[:：\-])\s*(.*))?$/u
  );
  if (!match) {
    return null;
  }

  const chapterRaw = match[1]?.trim() || '';
  const chapterNumber = parseChineseNumeralToInt(chapterRaw);
  if (!Number.isFinite(chapterNumber) || (chapterNumber as number) <= 0) {
    return null;
  }

  const chapterTitle = match[2]?.trim();
  const usedChineseNumeral = /[一二三四五六七八九十兩两〇零]/u.test(chapterRaw);
  return {
    chapterNumber: chapterNumber as number,
    title: chapterTitle,
    usedChineseNumeral,
  };
}

export function normalizeBreakdownContent(rawContent: string): BreakdownNormalizationResult {
  const lines = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const normalizedLines: string[] = [];
  const report: BreakdownNormalizationReport = {
    normalized: false,
    chapterHeadingFixes: 0,
    sectionHeadingFixes: 0,
    fieldHeadingFixes: 0,
    chineseNumeralConversions: 0,
    removedDividerLines: 0,
  };

  for (const rawLine of lines) {
    const line = cleanupLine(rawLine);
    if (!line) {
      normalizedLines.push('');
      continue;
    }
    if (HEADING_DIVIDER_RE.test(line)) {
      report.removedDividerLines += 1;
      report.normalized = true;
      continue;
    }

    const sectionHeading = normalizeSectionHeading(line);
    if (sectionHeading) {
      normalizedLines.push(sectionHeading);
      if (sectionHeading !== line) {
        report.sectionHeadingFixes += 1;
        report.normalized = true;
      }
      continue;
    }

    const chapterHeading = parseChapterHeading(line);
    if (chapterHeading) {
      const nextLine = `【第${chapterHeading.chapterNumber}章】${chapterHeading.title ? ` ${chapterHeading.title}` : ''}`;
      normalizedLines.push(nextLine);
      if (nextLine !== line) {
        report.chapterHeadingFixes += 1;
        report.normalized = true;
      }
      if (chapterHeading.usedChineseNumeral) {
        report.chineseNumeralConversions += 1;
        report.normalized = true;
      }
      continue;
    }

    const fieldHeading = normalizeFieldHeading(line);
    if (fieldHeading) {
      normalizedLines.push(fieldHeading);
      if (fieldHeading !== line) {
        report.fieldHeadingFixes += 1;
        report.normalized = true;
      }
      continue;
    }

    normalizedLines.push(line);
  }

  return {
    content: normalizedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    report,
  };
}

export function getBreakdownChapterBlocks(content: string): BreakdownChapterBlock[] {
  const headingRegex = /【第\s*(\d+)\s*章[^】]*】/gu;
  const matches: Array<{ chapterNumber: number; heading: string; start: number }> = [];
  let match = headingRegex.exec(content);
  while (match) {
    const chapterNumber = Number.parseInt(match[1], 10);
    if (Number.isFinite(chapterNumber) && chapterNumber > 0) {
      matches.push({
        chapterNumber,
        heading: match[0],
        start: match.index,
      });
    }
    match = headingRegex.exec(content);
  }

  return matches.map((entry, index) => {
    const end = index + 1 < matches.length ? matches[index + 1].start : content.length;
    return {
      chapterNumber: entry.chapterNumber,
      heading: entry.heading,
      start: entry.start,
      end,
      content: content.slice(entry.start, end).trim(),
    };
  });
}

export function extractChapterField(chapterContent: string, label: string): string {
  const inlinePattern = new RegExp(`【${label}】\\s*[:：]?\\s*([^\\n]+)`, 'u');
  const inline = chapterContent.match(inlinePattern);
  if (inline?.[1]) {
    return inline[1].trim();
  }
  const heading = `【${label}】`;
  const idx = chapterContent.indexOf(heading);
  if (idx < 0) {
    return '';
  }
  const after = chapterContent.slice(idx + heading.length);
  const firstLine = after
    .split('\n')
    .map((entry) => entry.replace(/^[\s:：\-*]+/u, '').trim())
    .find(Boolean);
  return firstLine ?? '';
}
