import { fetchModelCapability, fetchModels, generateStream } from '../lib/nim-client';
import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('NIM Client', () => {
  const collectStream = async (stream: AsyncGenerator<string, void, unknown>) => {
    let result = '';
    for await (const chunk of stream) {
      result += chunk;
    }
    return result;
  };

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
        '/api/nim/models',
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

      await expect(fetchModels('bad-key')).rejects.toThrow('Authentication failed. Check API key.');
    });
  });

  describe('fetchModelCapability', () => {
    it('probes capability successfully', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          chatSupported: true,
          thinkingSupported: 'supported',
          checkedAt: Date.now(),
          source: 'probe',
        }),
      });

      const capability = await fetchModelCapability('model-a', 'test-key');
      expect(capability.chatSupported).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/nim/capabilities',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
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
      const result = await collectStream(generator);

      expect(result).toBe('Hello World');
    });

    it('includes thinking params when supported', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"OK"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        body: mockStream,
      });

      await collectStream(
        generateStream('prompt', 'model-id', 'api-key', undefined, {
          enableThinking: true,
          thinkingSupported: true,
        })
      );

      const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(call[1].body);
      expect(payload.chat_template_kwargs).toEqual({ thinking: true });
    });

    it('omits thinking params when unsupported', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"OK"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        body: mockStream,
      });

      await collectStream(
        generateStream('prompt', 'model-id', 'api-key', undefined, {
          enableThinking: true,
          thinkingSupported: false,
        })
      );

      const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      const payload = JSON.parse(call[1].body);
      expect(payload.chat_template_kwargs).toBeUndefined();
    });

    it('retries retryable status codes and eventually succeeds', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Recovered"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      (global.fetch as unknown as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 504,
          text: async () => 'Gateway Timeout',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          body: mockStream,
        });

      const onRetry = vi.fn();
      const result = await collectStream(
        generateStream('prompt', 'model-id', 'api-key', undefined, {
          maxRetries: 2,
          retryDelay: 1,
          onRetry,
        })
      );

      expect(result).toBe('Recovered');
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, 2, 1, expect.any(Error));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, 2, 2, expect.any(Error));
    });

    it('does not retry non-retryable status codes', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(
        collectStream(
          generateStream('prompt', 'model-id', 'api-key', undefined, {
            maxRetries: 2,
            retryDelay: 1,
          })
        )
      ).rejects.toThrow('Invalid API key');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('stops retrying when user aborts during backoff', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 504,
        text: async () => 'Gateway Timeout',
      });

      const abortController = new AbortController();
      const streamPromise = collectStream(
        generateStream(
          'prompt',
          'model-id',
          'api-key',
          undefined,
          { maxRetries: 2, retryDelay: 50 },
          abortController.signal
        )
      );

      setTimeout(() => abortController.abort(), 10);

      await expect(streamPromise).rejects.toThrow('Request cancelled');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
