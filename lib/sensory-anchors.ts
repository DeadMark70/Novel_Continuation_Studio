function normalizeBlock(block: string): string {
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function splitBlocks(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function mergeSensoryAnchorBlocks(
  existing: string,
  incomingBlocks: string[]
): string {
  const mergedBlocks = [...splitBlocks(existing), ...incomingBlocks.map((entry) => entry.trim()).filter(Boolean)];
  const seen = new Set<string>();
  const uniqueBlocks: string[] = [];

  for (const block of mergedBlocks) {
    const key = normalizeBlock(block);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueBlocks.push(block);
  }

  return uniqueBlocks.join('\n\n');
}
