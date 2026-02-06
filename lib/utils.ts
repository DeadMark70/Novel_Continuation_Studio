import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeNovelText(content: string): string {
  if (!content) return '';

  // 1. Punctuation Unification
  const punctuationMap: Record<string, string> = {
    '！': '!',
    '？': '?',
    '。': '.',
    '，': ',',
    '：': ':',
    '；': ';',
    '（': '(',
    '）': ')',
    '『': '"',
    '』': '"',
    '「': '"',
    '」': '"',
    '…': '...',
    '—': '--',
  };

  let normalized = content;
  for (const [full, half] of Object.entries(punctuationMap)) {
    normalized = normalized.split(full).join(half);
  }

  // 2. Trim leading/trailing whitespace from every line
  normalized = normalized
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // 3. Compress 3+ consecutive newlines into 2
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  return normalized;
}

export function downloadAsTxt(title: string, original: string, chapters: string[]) {
  const separator = '\n\n' + '='.repeat(40) + '\n\n';
  
  let content = `TITLE: ${title}\n`;
  content += `EXPORT DATE: ${new Date().toLocaleString()}\n`;
  content += separator;
  content += `【ORIGINAL NOVEL】\n\n${original}\n`;
  
  chapters.forEach((chapter, index) => {
    content += separator;
    content += `【CHAPTER ${index + 1}】\n\n${chapter}\n`;
  });

  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') + '-' +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `novel_export_${timestamp}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
