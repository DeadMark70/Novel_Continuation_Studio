import { GET as getModels } from '../app/api/openrouter/models/route';
import { POST as postGenerate } from '../app/api/openrouter/generate/route';
import { vi } from 'vitest';

describe('/api/openrouter routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_DISABLE_NETWORK;
    delete process.env.E2E_MODE;
    delete process.env.INTERNAL_API_SECRET;
    delete process.env.ALLOW_UNSAFE_LOCAL;
  });

  it('returns 403 when network guard is enabled', async () => {
    process.env.OPENROUTER_DISABLE_NETWORK = '1';
    const fetchSpy = vi.spyOn(global, 'fetch');
    const response = await getModels(new Request('http://localhost/api/openrouter/models'));
    expect(response.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns normalized models response', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'openai/gpt-4o-mini',
            created: 123,
            name: 'GPT-4o mini',
            context_length: 128000,
            top_provider: { max_completion_tokens: 8192 },
            supported_parameters: ['temperature', 'top_p'],
          },
        ],
      }),
    } as Response);

    const response = await getModels(new Request('http://localhost/api/openrouter/models'));
    const json = await response.json() as { data: Array<{ id: string; supportedParameters: string[]; contextLength?: number; maxCompletionTokens?: number }> };
    expect(response.status).toBe(200);
    expect(json.data[0].id).toBe('openai/gpt-4o-mini');
    expect(json.data[0].supportedParameters).toContain('temperature');
    expect(json.data[0].contextLength).toBe(128000);
    expect(json.data[0].maxCompletionTokens).toBe(8192);
  });

  it('proxies streaming generation responses', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.INTERNAL_API_SECRET = 'internal-test-secret';
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n'));
        controller.close();
      },
    });

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      body: stream,
    } as Response);

    const response = await postGenerate(new Request('http://localhost/api/openrouter/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': 'internal-test-secret',
      },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
  });

  it('rejects generation when internal API secret is missing or invalid', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.INTERNAL_API_SECRET = 'internal-test-secret';

    const response = await postGenerate(new Request('http://localhost/api/openrouter/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: 'hello' }],
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(403);
  });
});
