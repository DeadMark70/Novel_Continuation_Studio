import { describe, expect, it, vi } from 'vitest';
import { createThrottledUpdater } from '../lib/streaming-throttle';

describe('streaming-throttle', () => {
  it('coalesces frequent updates and flushes latest value', () => {
    vi.useFakeTimers();
    const updates: string[] = [];
    const throttled = createThrottledUpdater({
      intervalMs: 100,
      onUpdate: (value) => updates.push(value),
    });

    throttled.push('a');
    throttled.push('ab');
    throttled.push('abc');
    expect(updates).toEqual(['a']);

    vi.advanceTimersByTime(100);
    expect(updates).toEqual(['a', 'abc']);

    throttled.cancel();
    vi.useRealTimers();
  });

  it('flush emits queued value immediately', () => {
    vi.useFakeTimers();
    const updates: string[] = [];
    const throttled = createThrottledUpdater({
      intervalMs: 100,
      onUpdate: (value) => updates.push(value),
    });

    throttled.push('hello');
    throttled.push('hello world');
    throttled.flush();

    expect(updates).toEqual(['hello', 'hello world']);

    throttled.cancel();
    vi.useRealTimers();
  });
});
