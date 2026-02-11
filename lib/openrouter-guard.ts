export function isOpenRouterNetworkDisabled(): boolean {
  const e2eOffline = process.env.E2E_MODE?.toLowerCase() === 'offline';
  const explicitDisable = process.env.OPENROUTER_DISABLE_NETWORK === '1';
  return e2eOffline || explicitDisable;
}

