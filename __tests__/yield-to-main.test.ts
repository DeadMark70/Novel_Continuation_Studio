import { describe, expect, it, vi } from 'vitest';
import { yieldToMain } from '../lib/yield-to-main';

describe('yield-to-main', () => {
  it('resolves on a macrotask, not synchronously', async () => {
    vi.useFakeTimers();
    const events: string[] = [];

    const pending = yieldToMain().then(() => {
      events.push('yielded');
    });

    events.push('sync');
    await Promise.resolve();
    expect(events).toEqual(['sync']);

    vi.runOnlyPendingTimers();
    await pending;
    expect(events).toEqual(['sync', 'yielded']);

    vi.useRealTimers();
  });
});
