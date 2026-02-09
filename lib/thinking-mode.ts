import { type ModelCapability } from '@/lib/nim-client';

const TRANSIENT_PROBE_REASON_PATTERNS = [
  'http 429',
  'http 500',
  'http 502',
  'http 503',
  'http 504',
  'too many requests',
  'timeout',
  'timed out',
  'network',
  'failed to fetch',
  'upstream',
];

function hasTransientProbeFailureReason(reason?: string): boolean {
  if (!reason) {
    return false;
  }

  const normalizedReason = reason.toLowerCase();
  return TRANSIENT_PROBE_REASON_PATTERNS.some((pattern) => normalizedReason.includes(pattern));
}

export function getEffectiveThinkingSupportState(
  capability?: ModelCapability
): ModelCapability['thinkingSupported'] {
  if (!capability) {
    return 'unknown';
  }

  if (capability.thinkingSupported !== 'unsupported') {
    return capability.thinkingSupported;
  }

  return hasTransientProbeFailureReason(capability.reason) ? 'unknown' : 'unsupported';
}

export function canAttemptThinking(
  thinkingEnabled: boolean,
  capability?: ModelCapability
): boolean {
  if (!thinkingEnabled) {
    return false;
  }

  return getEffectiveThinkingSupportState(capability) !== 'unsupported';
}

export function isThinkingUnsupported(capability?: ModelCapability): boolean {
  return getEffectiveThinkingSupportState(capability) === 'unsupported';
}
