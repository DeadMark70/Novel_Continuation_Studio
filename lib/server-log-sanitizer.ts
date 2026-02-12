const MAX_DEPTH = 4;

const SENSITIVE_KEY_PATTERN = /(authorization|api[-_]?key|token|secret|cookie|password)/i;
const BEARER_TOKEN_PATTERN = /(Bearer\s+)[A-Za-z0-9._\-]+/gi;
const KEY_VALUE_TOKEN_PATTERN = /((?:api[-_]?key|token|secret|password)\s*[:=]\s*)([^,\s]+)/gi;

function sanitizeString(value: string): string {
  return value
    .replace(BEARER_TOKEN_PATTERN, '$1[REDACTED]')
    .replace(KEY_VALUE_TOKEN_PATTERN, '$1[REDACTED]');
}

function sanitizeObject(value: Record<string, unknown>, depth: number): Record<string, unknown> {
  if (depth >= MAX_DEPTH) {
    return { truncated: true };
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        return [key, '[REDACTED]'];
      }
      return [key, sanitizeLogValue(entry, depth + 1)];
    })
  );
}

export function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      stack: value.stack ? sanitizeString(value.stack) : undefined,
    };
  }

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) {
      return ['[TRUNCATED]'];
    }
    return value.map((entry) => sanitizeLogValue(entry, depth + 1));
  }

  if (typeof value === 'object') {
    return sanitizeObject(value as Record<string, unknown>, depth);
  }

  return String(value);
}
