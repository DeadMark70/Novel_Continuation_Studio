import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchModels, generateStream } from '../lib/llm-client';

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
    delete process.env.NEXT_PUBLIC_OPENROUTER_DISABLE_NETWORK;
    delete process.env.NEXT_PUBLIC_E2E_MODE;
  });

  it('fails fast when openrouter network guard is enabled on client env', async () => {
    process.env.NEXT_PUBLIC_OPENROUTER_DISABLE_NETWORK = '1';
    await expect(fetchModels('openrouter', 'key')).rejects.toThrow(
      'OpenRouter network calls are disabled in this environment.'
    );
    await expect(
      collect(generateStream('openrouter', 'hello', 'openai/gpt-4o-mini', 'key'))
    ).rejects.toThrow('OpenRouter network calls are disabled in this environment.');
    expect(global.fetch).not.toHaveBeenCalled();
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
        enableThinking: true,
        thinkingSupported: true,
        thinkingBudget: 512,
        supportedParameters: ['reasoning', 'temperature', 'top_p', 'max_tokens'],
      }
    ));

    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const payload = JSON.parse(call[1].body);
    expect(payload.reasoning).toEqual({ max_tokens: 512 });
  });

  it('uses auto max_tokens and fills reasoning budget when thinking budget is empty', async () => {
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
        autoMaxTokens: true,
        maxContextTokens: 2000,
        maxCompletionTokens: 300,
        enableThinking: true,
        thinkingSupported: true,
        supportedParameters: ['reasoning', 'temperature', 'top_p', 'max_tokens'],
      }
    ));

    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const payload = JSON.parse(call[1].body);
    expect(payload.max_tokens).toBe(300);
    expect(payload.reasoning).toEqual({ max_tokens: 300 });
  });

  it('clamps openrouter max_tokens using model limits when provided', async () => {
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
        maxTokens: 100000,
        maxContextTokens: 2000,
        maxCompletionTokens: 300,
      }
    ));

    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const payload = JSON.parse(call[1].body);
    expect(payload.max_tokens).toBe(300);
  });

  it('retries with reduced max_tokens on openrouter context overflow', async () => {
    const successBody = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => '{"error":{"message":"This endpoint\'s maximum context length is 163840 tokens. However, you requested about 179743 tokens (29743 of text input, 150000 in the output)."}}',
      })
      .mockResolvedValueOnce({
        ok: true,
        body: successBody,
      });

    await collect(generateStream(
      'openrouter',
      'hello',
      'openai/gpt-4o-mini',
      'key',
      undefined,
      {
        maxTokens: 150000,
      }
    ));

    const firstPayload = JSON.parse((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const secondPayload = JSON.parse((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1][1].body);
    expect(firstPayload.max_tokens).toBe(150000);
    expect(secondPayload.max_tokens).toBe(133841);
  });

  it('retries with reduced max_tokens on nim context overflow', async () => {
    const successBody = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          '{"error":"NIM API Error: {\\"error\\":{\\"message\\":\\"\'max_tokens\' or \'max_completion_tokens\' is too large: 256000. This model\'s maximum context length is 262144 tokens and your request has 20354 input tokens.\\"}}"}',
      })
      .mockResolvedValueOnce({
        ok: true,
        body: successBody,
      });

    await collect(generateStream(
      'nim',
      'hello',
      'meta/llama-3.1-405b-instruct',
      'key',
      undefined,
      {
        maxTokens: 256000,
      }
    ));

    const firstPayload = JSON.parse((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    const secondPayload = JSON.parse((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[1][1].body);
    expect(firstPayload.max_tokens).toBe(256000);
    expect(secondPayload.max_tokens).toBe(241534);
  });

  it('surfaces actionable error when input alone exceeds model context length', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () =>
        '{"error":{"message":"The input (20024 tokens) is longer than the model\'s context length (8192 tokens)."}}',
    });

    await expect(
      collect(generateStream(
        'openrouter',
        'hello',
        'openai/gpt-4o-mini',
        'key',
        undefined,
        {
          maxTokens: 4096,
          maxRetries: 1,
        }
      ))
    ).rejects.toThrow('input 20024 tokens exceeds model context 8192');
  });
});
