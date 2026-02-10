import { describe, expect, it } from 'vitest';
import { resolveWorkflowMode } from '../lib/workflow-mode';

describe('resolveWorkflowMode', () => {
  it('returns AUTO-RUN for compression step when auto threshold exceeded', () => {
    const result = resolveWorkflowMode({
      stepId: 'compression',
      compressionMode: 'auto',
      compressionAutoThreshold: 20000,
      sourceChars: 22000,
      compressedContext: '',
    });

    expect(result.badge).toBe('AUTO-RUN');
    expect(result.isCompressed).toBe(true);
  });

  it('returns AUTO-SKIP for compression step when auto threshold not exceeded', () => {
    const result = resolveWorkflowMode({
      stepId: 'compression',
      compressionMode: 'auto',
      compressionAutoThreshold: 20000,
      sourceChars: 15000,
      compressedContext: '',
    });

    expect(result.badge).toBe('AUTO-SKIP');
    expect(result.isCompressed).toBe(false);
  });

  it('returns COMPRESSED for analysis when compression is active and context exists', () => {
    const result = resolveWorkflowMode({
      stepId: 'analysis',
      compressionMode: 'on',
      compressionAutoThreshold: 20000,
      sourceChars: 10000,
      compressedContext: 'ctx',
    });

    expect(result.badge).toBe('COMPRESSED');
    expect(result.isCompressed).toBe(true);
  });

  it('returns RAW for analysis when compressed context is missing', () => {
    const result = resolveWorkflowMode({
      stepId: 'analysis',
      compressionMode: 'on',
      compressionAutoThreshold: 20000,
      sourceChars: 10000,
      compressedContext: '',
    });

    expect(result.badge).toBe('RAW');
    expect(result.isCompressed).toBe(false);
  });
});
