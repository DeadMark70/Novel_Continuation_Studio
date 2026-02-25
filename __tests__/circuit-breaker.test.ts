import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COOLDOWN_MS,
  FAILURE_THRESHOLD,
  getCircuitState,
  recordFailure,
  recordSuccess,
  resetCircuit,
  tryAcquireCircuitPass,
} from '../lib/circuit-breaker';

describe('circuit-breaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-25T00:00:00.000Z'));
    resetCircuit();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens after configured consecutive final failures', () => {
    for (let count = 0; count < FAILURE_THRESHOLD; count += 1) {
      recordFailure('nim');
    }

    const state = getCircuitState('nim');
    expect(state.consecutiveFailures).toBe(FAILURE_THRESHOLD);
    expect(state.isOpen).toBe(true);
    expect(tryAcquireCircuitPass('nim')).toBe(false);
  });

  it('resets state on success', () => {
    for (let count = 0; count < FAILURE_THRESHOLD; count += 1) {
      recordFailure('nim');
    }

    recordSuccess('nim');
    const state = getCircuitState('nim');
    expect(state.isOpen).toBe(false);
    expect(state.consecutiveFailures).toBe(0);
    expect(state.lastFailureAt).toBe(0);
    expect(state.halfOpenTrialInProgress).toBe(false);
  });

  it('allows one half-open trial after cooldown and reopens on failure', () => {
    for (let count = 0; count < FAILURE_THRESHOLD; count += 1) {
      recordFailure('nim');
    }

    vi.setSystemTime(Date.now() + COOLDOWN_MS + 1);
    expect(tryAcquireCircuitPass('nim')).toBe(true);
    expect(tryAcquireCircuitPass('nim')).toBe(false);

    recordFailure('nim');
    const reopened = getCircuitState('nim');
    expect(reopened.isOpen).toBe(true);
    expect(reopened.halfOpenTrialInProgress).toBe(false);
  });

  it('tracks providers independently', () => {
    for (let count = 0; count < FAILURE_THRESHOLD; count += 1) {
      recordFailure('nim');
    }

    const nimState = getCircuitState('nim');
    const openRouterState = getCircuitState('openrouter');
    expect(nimState.isOpen).toBe(true);
    expect(openRouterState.isOpen).toBe(false);
    expect(tryAcquireCircuitPass('openrouter')).toBe(true);
  });

  it('supports reset for a single provider and global reset', () => {
    for (let count = 0; count < FAILURE_THRESHOLD; count += 1) {
      recordFailure('nim');
      recordFailure('openrouter');
    }

    resetCircuit('nim');
    expect(getCircuitState('nim').isOpen).toBe(false);
    expect(getCircuitState('openrouter').isOpen).toBe(true);

    resetCircuit();
    expect(getCircuitState('nim').isOpen).toBe(false);
    expect(getCircuitState('openrouter').isOpen).toBe(false);
  });
});
