export interface SectionRequirement {
  name: string;
  aliases?: string[];
}

export interface SectionValidationResult {
  ok: boolean;
  missing: string[];
  found: string[];
}

const HEADING_PATTERN = /【\s*([^【】\n]+?)\s*】/g;

function normalizeHeading(value: string): string {
  return value.replace(/\s+/g, '').trim().toLowerCase();
}

function toRequirement(input: string | SectionRequirement): SectionRequirement {
  if (typeof input === 'string') {
    return { name: input };
  }
  return input;
}

export function extractHeadings(content: string): string[] {
  const headings: string[] = [];
  const seen = new Set<string>();
  for (const match of content.matchAll(HEADING_PATTERN)) {
    const heading = (match[1] || '').trim();
    if (!heading) {
      continue;
    }
    const key = normalizeHeading(heading);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    headings.push(heading);
  }
  return headings;
}

export function validateRequiredSections(
  content: string,
  requirements: Array<string | SectionRequirement>
): SectionValidationResult {
  const resolvedRequirements = requirements.map(toRequirement);
  if (resolvedRequirements.length === 0) {
    return { ok: true, missing: [], found: extractHeadings(content) };
  }

  const found = extractHeadings(content);
  const normalizedFound = new Set(found.map(normalizeHeading));
  const missing = resolvedRequirements
    .filter((requirement) => {
      const accepted = [requirement.name, ...(requirement.aliases ?? [])]
        .map(normalizeHeading);
      return !accepted.some((candidate) => normalizedFound.has(candidate));
    })
    .map((requirement) => requirement.name);

  return {
    ok: missing.length === 0,
    missing,
    found,
  };
}
