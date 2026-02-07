import { POST } from '../app/api/nim/generate/route';
import { vi } from 'vitest';

describe('/api/nim/generate route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as unknown as ReturnType<typeof vi.fn>) = vi.fn();
  });

  it('forwards optional generation parameters to upstream API', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.close();
      },
    });

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      body: stream,
    });

    const request = new Request('http://localhost/api/nim/generate', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'model-a',
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 100,
        temperature: 0.2,
        top_p: 0.8,
        frequency_penalty: 0.1,
        presence_penalty: 0.2,
        seed: 42,
        chat_template_kwargs: { thinking: true },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const payload = JSON.parse((global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(payload.frequency_penalty).toBe(0.1);
    expect(payload.presence_penalty).toBe(0.2);
    expect(payload.seed).toBe(42);
    expect(payload.chat_template_kwargs).toEqual({ thinking: true });
  });

  it('returns 401 when API key is missing', async () => {
    const previous = process.env.NIM_API_KEY;
    delete process.env.NIM_API_KEY;

    const request = new Request('http://localhost/api/nim/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'model-a',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    if (previous !== undefined) {
      process.env.NIM_API_KEY = previous;
    }
  });
});
