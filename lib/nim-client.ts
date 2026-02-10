export interface NimModel {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

export interface ModelCapability {
  chatSupported: boolean;
  thinkingSupported: 'supported' | 'unsupported' | 'unknown';
  reason?: string;
  checkedAt: number;
  source: 'probe' | 'override';
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  seed?: number;
  enableThinking?: boolean;
  thinkingSupported?: boolean;
  // Inactivity timeout (ms): applies to first-byte wait and stream gaps.
  // Legacy alias: `timeout`.
  timeout?: number;
  inactivityTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  retryableErrors?: number[];
  onRetry?: (attempt: number, maxRetries: number, delay: number, error: unknown) => void;
  onError?: (error: unknown, context?: string) => void;
}

function modelRejectsChatTemplateKwargs(model: string): boolean {
  const normalized = model.toLowerCase();
  return normalized.includes('mistral');
}

class NimHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'NimHttpError';
  }
}

function createAbortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isRetryableError(error: unknown, retryableErrors: number[]): boolean {
  return error instanceof NimHttpError && retryableErrors.includes(error.status);
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Request timed out';
}

function waitWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ms <= 0) {
      resolve();
      return;
    }

    const timerId = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(createAbortError());
    };

    const cleanup = () => {
      clearTimeout(timerId);
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(createAbortError());
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

export async function fetchModels(apiKey?: string): Promise<NimModel[]> {
  const headers: HeadersInit = {
    'Accept': 'application/json',
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  try {
    // Call local API route
    const response = await fetch('/api/nim/models', { headers });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Check API key.');
      }
      const errorText = await response.text();
      throw new Error(`Failed to fetch models: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Fetch models error:', error);
    throw error;
  }
}

export async function fetchModelCapability(
  model: string,
  apiKey?: string
): Promise<ModelCapability> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch('/api/nim/capabilities', {
    method: 'POST',
    headers,
    body: JSON.stringify({ model }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to probe model capability: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<ModelCapability>;
}

export async function* generateStream(
  prompt: string,
  model: string,
  apiKey: string, // Can be empty if using server-side env var
  systemPrompt?: string,
  options?: GenerateOptions,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  
  const {
    maxTokens = 4096,
    temperature = 0.7,
    topP = 1,
    frequencyPenalty,
    presencePenalty,
    seed,
    enableThinking = false,
    thinkingSupported = false,
    timeout,
    inactivityTimeout,
    maxRetries = 2,
    retryDelay = 3000,
    retryableErrors = [504, 502, 503],
    onRetry,
    onError
  } = options || {};

  const resolvedInactivityTimeout = Math.max(
    0,
    inactivityTimeout ??
      timeout ??
      (enableThinking && thinkingSupported ? 10 * 60 * 1000 : 5 * 60 * 1000)
  );

  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: prompt }
  ];
  const canSendThinkingKwargs = (
    enableThinking &&
    thinkingSupported &&
    !modelRejectsChatTemplateKwargs(model)
  );

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const resetTimeout = () => {
      if (resolvedInactivityTimeout <= 0) {
        return;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => controller.abort(), resolvedInactivityTimeout);
    };

    const clearTimeoutGuard = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    try {
      resetTimeout();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      const response = await fetch('/api/nim/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          top_p: topP,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          seed,
          chat_template_kwargs: canSendThinkingKwargs ? { thinking: true } : undefined,
        }),
        signal: controller.signal,
      });
      resetTimeout();

      if (!response.ok) {
        if (response.status === 429) throw new Error('Rate limit exceeded');
        if (response.status === 401) throw new Error('Invalid API key');
        const errorText = await response.text();
        throw new NimHttpError(response.status, `NIM API Error (${response.status}): ${errorText.slice(0, 200)}`);
      }

      if (!response.body) throw new Error('Response body is null');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (controller.signal.aborted) {
          await reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        resetTimeout();
        if (done) {
          console.log('[SSE] Stream ended (done=true)');
          break;
        }

        const rawChunk = decoder.decode(value, { stream: true });
        buffer += rawChunk;
        
        // Debug: Log first few raw chunks
        if (buffer.length < 2000) {
          console.log('[SSE] Raw chunk received:', rawChunk.substring(0, 200));
        }
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              
              // ✅ Check if API returned an error object
              if (json.error) {
                const errorMessage = json.error.message || json.error.type || 'Unknown API error';
                console.error('[SSE] API Error in stream:', errorMessage);
                throw new Error(`API Error: ${errorMessage}`);
              }
              
              // Try multiple possible content locations
              const content = json.choices?.[0]?.delta?.content 
                || json.choices?.[0]?.message?.content
                || json.content
                || json.text;
              
              if (content) {
                yield content;
              }
            } catch (e) {
              if (e instanceof Error && e.message.startsWith('API Error:')) {
                throw e;
              }
              onError?.(e, trimmed);
              console.warn('Failed to parse SSE:', trimmed);
            }
          }
        }
      }

      // Process any remaining content in buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed !== 'data: [DONE]' && trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            console.warn('Failed to parse remaining SSE buffer:', trimmed);
          }
        }
      }

      return;
    } catch (error) {
      let normalizedError: unknown = error;
      if (isAbortError(error)) {
        if (signal?.aborted) {
          throw new Error('Request cancelled');
        }
        normalizedError = new Error('Request timed out');
      }
      lastError = normalizedError;

      if (
        (isRetryableError(normalizedError, retryableErrors) || isTimeoutError(normalizedError)) &&
        attempt < maxRetries
      ) {
        const nextAttempt = attempt + 1;
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`[NIM] Retry ${nextAttempt}/${maxRetries} after ${delay}ms`);
        onRetry?.(nextAttempt, maxRetries, delay, normalizedError);
        try {
          await waitWithAbort(delay, signal);
        } catch (waitError) {
          if (isAbortError(waitError) && signal?.aborted) {
            throw new Error('Request cancelled');
          }
          throw waitError;
        }
        continue;
      }

      throw normalizedError;
    } finally {
      clearTimeoutGuard();
      if (signal) {
        signal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown generation error');
}
