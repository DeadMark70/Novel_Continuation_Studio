import {
  canAttemptThinking,
  getEffectiveThinkingSupportState,
  isThinkingUnsupported
} from '../lib/thinking-mode';
import { type ModelCapability } from '../lib/nim-client';

function capability(
  state: ModelCapability['thinkingSupported'],
  reason?: string
): ModelCapability {
  return {
    chatSupported: true,
    thinkingSupported: state,
    reason,
    checkedAt: Date.now(),
    source: 'probe',
  };
}

describe('thinking mode decision helpers', () => {
  it('blocks when user toggle is off', () => {
    expect(canAttemptThinking(false, capability('supported'))).toBe(false);
    expect(canAttemptThinking(false, capability('unknown'))).toBe(false);
  });

  it('allows when capability is supported', () => {
    expect(canAttemptThinking(true, capability('supported'))).toBe(true);
  });

  it('allows optimistic attempt when capability is unknown or missing', () => {
    expect(canAttemptThinking(true, capability('unknown'))).toBe(true);
    expect(canAttemptThinking(true, undefined)).toBe(true);
  });

  it('blocks when capability is explicitly unsupported', () => {
    expect(canAttemptThinking(true, capability('unsupported'))).toBe(false);
    expect(isThinkingUnsupported(capability('unsupported'))).toBe(true);
  });

  it('treats transient legacy unsupported reasons as unknown', () => {
    const legacyCapability = capability('unsupported', 'HTTP 500: Upstream timeout');
    expect(getEffectiveThinkingSupportState(legacyCapability)).toBe('unknown');
    expect(isThinkingUnsupported(legacyCapability)).toBe(false);
    expect(canAttemptThinking(true, legacyCapability)).toBe(true);
  });
});
