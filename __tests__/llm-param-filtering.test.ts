import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateStream } from '../lib/llm-client';

global.fetch = vi.fn();

describe('llm-client parameter filtering', () => {
  const collect = async (stream: AsyncGenerator<string, void, unknown>) => {
    let text = '';
    for await (const chunk of stream) {
      text += chunk;
    }
    return text;
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('drops unsupported params for openrouter when support map is present', async () => {
    const body = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body,
    });

    await collect(generateStream(
      'openrouter',
      'hello',
      'openai/gpt-4o-mini',
      'key',
      undefined,
      {
        topK: 40,
        frequencyPenalty: 0.5,
        supportedParameters: ['temperature', 'top_p', 'max_tokens'],
      }
    ));

    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const payload = JSON.parse(call[1].body);
    expect(payload.top_k).toBeUndefined();
    expect(payload.frequency_penalty).toBeUndefined();
    expect(payload.temperature).toBe(0.7);
  });

  it('includes reasoning payload when supported and thinking budget provided', async () => {
    const body = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body,
    });

    await collect(generateStream(
      'openrouter',
      'hello',
      'openai/gpt-4o-mini',
      'key',
      undefined,
      {
        thinkingBudget: 512,
        supportedParameters: ['reasoning', 'temperature', 'top_p', 'max_tokens'],
      }
    ));

    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const payload = JSON.parse(call[1].body);
    expect(payload.reasoning).toEqual({ max_tokens: 512 });
  });
});
