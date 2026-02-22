export interface AnalysisOutputSections {
  detail: string;
  executiveSummary: string;
  tagged: boolean;
}

function extractTaggedSection(raw: string, tagName: string): string {
  const pattern = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = raw.match(pattern);
  return (match?.[1] || '').trim();
}

export function parseAnalysisOutput(raw: string): AnalysisOutputSections {
  const source = raw.trim();
  if (!source) {
    return {
      detail: '',
      executiveSummary: '',
      tagged: false,
    };
  }

  const detail = extractTaggedSection(source, 'analysis_detail');
  const executiveSummary = extractTaggedSection(source, 'executive_summary');
  if (!detail && !executiveSummary) {
    return {
      detail: source,
      executiveSummary: '',
      tagged: false,
    };
  }

  return {
    detail: detail || source,
    executiveSummary,
    tagged: true,
  };
}
