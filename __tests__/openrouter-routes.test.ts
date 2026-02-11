import { GET as getModels } from '../app/api/openrouter/models/route';
import { POST as postGenerate } from '../app/api/openrouter/generate/route';
import { vi } from 'vitest';

describe('/api/openrouter routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENROUTER_API_KEY;
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
            supported_parameters: ['temperature', 'top_p'],
          },
        ],
      }),
    } as Response);

    const response = await getModels(new Request('http://localhost/api/openrouter/models'));
    const json = await response.json() as { data: Array<{ id: string; supportedParameters: string[] }> };
    expect(response.status).toBe(200);
    expect(json.data[0].id).toBe('openai/gpt-4o-mini');
    expect(json.data[0].supportedParameters).toContain('temperature');
  });

  it('proxies streaming generation responses', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
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
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');
  });
});
