const OPENROUTER_GUARD_MESSAGE = 'OpenRouter network calls are disabled in this environment.';

function isTruthyDisabledFlag(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true';
}

export function getOpenRouterGuardMessage(): string {
  return OPENROUTER_GUARD_MESSAGE;
}

export function isOpenRouterNetworkDisabledServer(): boolean {
  const e2eOffline = process.env.E2E_MODE?.toLowerCase() === 'offline';
  const explicitDisable = isTruthyDisabledFlag(process.env.OPENROUTER_DISABLE_NETWORK);
  return e2eOffline || explicitDisable;
}

export function isOpenRouterNetworkDisabledClient(): boolean {
  const e2eOffline = process.env.NEXT_PUBLIC_E2E_MODE?.toLowerCase() === 'offline';
  const explicitDisable = isTruthyDisabledFlag(process.env.NEXT_PUBLIC_OPENROUTER_DISABLE_NETWORK);
  return e2eOffline || explicitDisable;
}

export function isOpenRouterNetworkDisabled(): boolean {
  return typeof window === 'undefined'
    ? isOpenRouterNetworkDisabledServer()
    : isOpenRouterNetworkDisabledClient();
}

export function assertOpenRouterNetworkEnabled(): void {
  if (isOpenRouterNetworkDisabled()) {
    throw new Error(OPENROUTER_GUARD_MESSAGE);
  }
}
