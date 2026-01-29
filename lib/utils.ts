import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}_export.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
