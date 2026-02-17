import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNovelPersistenceLifecycle } from '../hooks/useNovelPersistenceLifecycle';
import { useNovelStore } from '../store/useNovelStore';

function Harness() {
  useNovelPersistenceLifecycle();
  return null;
}

describe('useNovelPersistenceLifecycle', () => {
  const flushPendingPersist = vi.fn(async () => undefined);
  const hasPendingPersist = vi.fn(() => true);

  beforeEach(() => {
    vi.restoreAllMocks();
    flushPendingPersist.mockClear();
    hasPendingPersist.mockClear();
    hasPendingPersist.mockReturnValue(true);
    vi.spyOn(useNovelStore, 'getState').mockReturnValue({
      hasPendingPersist,
      flushPendingPersist,
    } as unknown as ReturnType<typeof useNovelStore.getState>);
  });

  it('flushes pending data on pagehide', () => {
    render(<Harness />);

    window.dispatchEvent(new Event('pagehide'));

    expect(hasPendingPersist).toHaveBeenCalledTimes(1);
    expect(flushPendingPersist).toHaveBeenCalledTimes(1);
  });

  it('flushes only when visibility changes to hidden', () => {
    const visibilitySpy = vi.spyOn(document, 'visibilityState', 'get');
    visibilitySpy.mockReturnValue('visible');

    render(<Harness />);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(flushPendingPersist).not.toHaveBeenCalled();

    visibilitySpy.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(flushPendingPersist).toHaveBeenCalledTimes(1);
  });
});
