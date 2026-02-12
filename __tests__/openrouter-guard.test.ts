import { describe, expect, it } from 'vitest';
import {
  getOpenRouterGuardMessage,
  isOpenRouterNetworkDisabledClient,
  isOpenRouterNetworkDisabledServer,
} from '../lib/openrouter-guard';

describe('openrouter-guard', () => {
  it('returns a stable guard message', () => {
    expect(getOpenRouterGuardMessage()).toBe('OpenRouter network calls are disabled in this environment.');
  });

  it('detects server disable flags', () => {
    process.env.E2E_MODE = 'offline';
    expect(isOpenRouterNetworkDisabledServer()).toBe(true);
    delete process.env.E2E_MODE;

    process.env.OPENROUTER_DISABLE_NETWORK = '1';
    expect(isOpenRouterNetworkDisabledServer()).toBe(true);
    delete process.env.OPENROUTER_DISABLE_NETWORK;
  });

  it('detects client disable flags', () => {
    process.env.NEXT_PUBLIC_E2E_MODE = 'offline';
    expect(isOpenRouterNetworkDisabledClient()).toBe(true);
    delete process.env.NEXT_PUBLIC_E2E_MODE;

    process.env.NEXT_PUBLIC_OPENROUTER_DISABLE_NETWORK = '1';
    expect(isOpenRouterNetworkDisabledClient()).toBe(true);
    delete process.env.NEXT_PUBLIC_OPENROUTER_DISABLE_NETWORK;
  });
});
