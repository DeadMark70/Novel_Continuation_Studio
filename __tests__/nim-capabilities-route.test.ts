import { POST } from '../app/api/nim/capabilities/route';
import { vi } from 'vitest';

describe('/api/nim/capabilities route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as unknown as ReturnType<typeof vi.fn>) = vi.fn();
  });

  it('returns supported when base and thinking probes pass', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const request = new Request('http://localhost/api/nim/capabilities', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'model-a' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.chatSupported).toBe(true);
    expect(data.thinkingSupported).toBe('supported');
  });

  it('returns unsupported thinking when second probe fails', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Unsupported parameter',
      });

    const request = new Request('http://localhost/api/nim/capabilities', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'model-b' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.chatSupported).toBe(true);
    expect(data.thinkingSupported).toBe('unsupported');
  });

  it('returns unknown when thinking probe has transient server failure', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Upstream timeout',
      });

    const request = new Request('http://localhost/api/nim/capabilities', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'model-d' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.chatSupported).toBe(true);
    expect(data.thinkingSupported).toBe('unknown');
  });

  it('returns unknown when thinking probe is rate-limited', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Too Many Requests',
      });

    const request = new Request('http://localhost/api/nim/capabilities', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'model-c' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.chatSupported).toBe(true);
    expect(data.thinkingSupported).toBe('unknown');
  });
});
