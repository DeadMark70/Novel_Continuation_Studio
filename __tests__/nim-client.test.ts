import { fetchModels, generateStream } from '../lib/nim-client';
import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('NIM Client', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchModels', () => {
    it('fetches models successfully', async () => {
      const mockModels = [{ id: 'model-a' }, { id: 'model-b' }];
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockModels }),
      });

      const models = await fetchModels('test-key');
      expect(models).toEqual(mockModels);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://integrate.api.nvidia.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('throws error on failure', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(fetchModels('bad-key')).rejects.toThrow('Failed to fetch models: 401 Unauthorized');
    });
  });

  describe('generateStream', () => {
    it('streams content correctly', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          const chunks = [
            'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":" World"}}]}\n\n',
            'data: [DONE]\n\n'
          ];
          chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
          controller.close();
        }
      });

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        body: mockStream,
      });

      const generator = generateStream('prompt', 'model-id', 'api-key');
      let result = '';
      for await (const chunk of generator) {
        result += chunk;
      }

      expect(result).toBe('Hello World');
    });
  });
});
