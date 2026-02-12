import { describe, expect, it } from 'vitest';
import { estimateTokenCount, estimateTokenCountHeuristic } from '../lib/token-estimator';

describe('token-estimator', () => {
  it('returns heuristic token count for mixed text', () => {
    const count = estimateTokenCountHeuristic('hello 世界');
    expect(count).toBeGreaterThan(0);
  });

  it('returns deterministic fallback count in test env', async () => {
    const count = await estimateTokenCount('hello world');
    expect(count).toBeGreaterThan(0);
  });
});
