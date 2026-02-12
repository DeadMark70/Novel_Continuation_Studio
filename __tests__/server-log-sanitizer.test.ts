import { describe, expect, it } from 'vitest';
import { sanitizeLogValue } from '../lib/server-log-sanitizer';

describe('server-log-sanitizer', () => {
  it('redacts sensitive keys in nested objects', () => {
    const sanitized = sanitizeLogValue({
      headers: {
        Authorization: 'Bearer abc.def',
      },
      apiKey: 'secret',
      nested: {
        token: 'xyz',
      },
    }) as Record<string, unknown>;

    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect((sanitized.nested as Record<string, unknown>).token).toBe('[REDACTED]');
  });

  it('redacts bearer and key-value patterns in strings', () => {
    const sanitized = sanitizeLogValue(
      'Authorization: Bearer abc123 api_key=secret token:abcd'
    );
    expect(sanitized).toBe(
      'Authorization: Bearer [REDACTED] api_key=[REDACTED] token:[REDACTED]'
    );
  });

  it('sanitizes Error objects', () => {
    const error = new Error('Request failed with Bearer abc123');
    const sanitized = sanitizeLogValue(error) as Record<string, unknown>;
    expect(sanitized.name).toBe('Error');
    expect(sanitized.message).toBe('Request failed with Bearer [REDACTED]');
  });
});
