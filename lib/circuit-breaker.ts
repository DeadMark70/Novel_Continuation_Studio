import type { LLMProvider } from '@/lib/llm-types';

export interface CircuitBreakerState {
  consecutiveFailures: number;
  lastFailureAt: number;
  isOpen: boolean;
  halfOpenTrialInProgress: boolean;
}

export const FAILURE_THRESHOLD = 3;
export const COOLDOWN_MS = 60_000;
export const CIRCUIT_OPEN_ERROR_MESSAGE =
  'Circuit breaker is open: too many consecutive failures. Wait or check API status.';

const INITIAL_STATE: CircuitBreakerState = {
  consecutiveFailures: 0,
  lastFailureAt: 0,
  isOpen: false,
  halfOpenTrialInProgress: false,
};

const providerState: Record<LLMProvider, CircuitBreakerState> = {
  nim: { ...INITIAL_STATE },
  openrouter: { ...INITIAL_STATE },
};

function resetState(state: CircuitBreakerState): void {
  state.consecutiveFailures = 0;
  state.lastFailureAt = 0;
  state.isOpen = false;
  state.halfOpenTrialInProgress = false;
}

export function tryAcquireCircuitPass(provider: LLMProvider): boolean {
  const state = providerState[provider];
  if (!state.isOpen) {
    return true;
  }

  const now = Date.now();
  const isCoolingDown = now - state.lastFailureAt < COOLDOWN_MS;
  if (isCoolingDown) {
    return false;
  }

  if (state.halfOpenTrialInProgress) {
    return false;
  }

  state.halfOpenTrialInProgress = true;
  return true;
}

export function recordSuccess(provider: LLMProvider): void {
  resetState(providerState[provider]);
}

export function recordFailure(provider: LLMProvider): void {
  const state = providerState[provider];
  state.consecutiveFailures += 1;
  state.lastFailureAt = Date.now();
  state.halfOpenTrialInProgress = false;

  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.isOpen = true;
  }
}

export function resetCircuit(provider?: LLMProvider): void {
  if (provider) {
    resetState(providerState[provider]);
    return;
  }

  resetState(providerState.nim);
  resetState(providerState.openrouter);
}

export function getCircuitState(provider: LLMProvider): CircuitBreakerState {
  return { ...providerState[provider] };
}

export function createCircuitOpenError(provider: LLMProvider): Error {
  return new Error(`${provider.toUpperCase()}: ${CIRCUIT_OPEN_ERROR_MESSAGE}`);
}

export function isCircuitBreakerOpenError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes(CIRCUIT_OPEN_ERROR_MESSAGE)
  );
}
