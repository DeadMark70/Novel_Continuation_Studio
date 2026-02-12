import type { GenerateOptions, LLMModel, LLMProvider, ModelCapability } from '@/lib/llm-types';

function modelRejectsChatTemplateKwargs(model: string): boolean {
  const normalized = model.toLowerCase();
  return normalized.includes('mistral');
}

class ProviderHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ProviderHttpError';
  }
}

function estimateTokenCount(text: string): number {
  if (!text) {
    return 0;
  }
  const asciiCount = (text.match(/[\x00-\x7F]/g) || []).length;
  const nonAsciiCount = text.length - asciiCount;
  // Heuristic: ASCII ~4 chars/token, CJK and other non-ASCII ~1.5 chars/token.
  return Math.max(1, Math.ceil(asciiCount / 4 + nonAsciiCount / 1.5));
}

function clampOpenRouterMaxTokens(
  prompt: string,
  requestedMaxTokens: number,
  maxContextTokens?: number,
  maxCompletionTokens?: number
): number {
  let upperBound = Math.max(1, Math.floor(requestedMaxTokens));

  if (typeof maxCompletionTokens === 'number' && Number.isFinite(maxCompletionTokens) && maxCompletionTokens > 0) {
    upperBound = Math.min(upperBound, Math.floor(maxCompletionTokens));
  }

  if (typeof maxContextTokens === 'number' && Number.isFinite(maxContextTokens) && maxContextTokens > 0) {
    const estimatedPromptTokens = estimateTokenCount(prompt);
    const reservedTail = 256; // Leave safety margin for wrappers/tooling tokens.
    const byContext = Math.max(1, Math.floor(maxContextTokens) - estimatedPromptTokens - reservedTail);
    upperBound = Math.min(upperBound, byContext);
  }

  return Math.max(1, upperBound);
}

function parseOpenRouterContextError(message: string): {
  maxContextTokens: number;
  inputTokens?: number;
  requestedOutputTokens?: number;
} | null {
  const maxMatch = message.match(/maximum context length is\s*([\d,]+)\s*tokens/i);
  if (!maxMatch) {
    return null;
  }

  const maxContextTokens = Number.parseInt(maxMatch[1].replace(/,/g, ''), 10);
  if (!Number.isFinite(maxContextTokens) || maxContextTokens <= 0) {
    return null;
  }

  const ioMatch = message.match(/\(([\d,]+)\s*of text input,\s*([\d,]+)\s*in the output/i);
  const inputTokens = ioMatch ? Number.parseInt(ioMatch[1].replace(/,/g, ''), 10) : undefined;
  const requestedOutputTokens = ioMatch ? Number.parseInt(ioMatch[2].replace(/,/g, ''), 10) : undefined;

  return {
    maxContextTokens,
    inputTokens: Number.isFinite(inputTokens) ? inputTokens : undefined,
    requestedOutputTokens: Number.isFinite(requestedOutputTokens) ? requestedOutputTokens : undefined,
  };
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
  return error instanceof ProviderHttpError && retryableErrors.includes(error.status);
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

function getModelsUrl(provider: LLMProvider): string {
  return provider === 'openrouter' ? '/api/openrouter/models' : '/api/nim/models';
}

function getGenerateUrl(provider: LLMProvider): string {
  return provider === 'openrouter' ? '/api/openrouter/generate' : '/api/nim/generate';
}

export async function fetchModels(
  provider: LLMProvider,
  apiKey?: string
): Promise<LLMModel[]> {
  const headers: HeadersInit = {
    Accept: 'application/json',
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch(getModelsUrl(provider), { headers });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication failed. Check API key.');
    }
    throw new Error(`Failed to fetch models: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();
  return data.data || [];
}

function normalizeSupportedParameters(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((value): value is string => typeof value === 'string');
}

export async function fetchModelParameterSupport(
  provider: LLMProvider,
  model: string,
  apiKey?: string
): Promise<string[]> {
  if (provider === 'nim') {
    return [];
  }

  const models = await fetchModels(provider, apiKey);
  const found = models.find((entry) => entry.id === model);
  return normalizeSupportedParameters(found?.supportedParameters);
}

export async function fetchModelCapability(
  provider: LLMProvider,
  model: string,
  apiKey?: string
): Promise<ModelCapability> {
  if (provider === 'nim') {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetch('/api/nim/capabilities', {
      method: 'POST',
      headers,
      body: JSON.stringify({ model }),
    });

    if (!response.ok) {
      throw new Error(`Failed to probe model capability: ${response.status} - ${await response.text()}`);
    }
    return response.json() as Promise<ModelCapability>;
  }

  // OpenRouter model capabilities are metadata-driven from /models.
  const support = await fetchModelParameterSupport(provider, model, apiKey);
  const supportsThinking = support.includes('reasoning') || support.includes('include_reasoning');
  return {
    chatSupported: true,
    thinkingSupported: supportsThinking ? 'supported' : 'unknown',
    reason: supportsThinking ? undefined : 'No explicit reasoning parameter support advertised by model metadata.',
    checkedAt: Date.now(),
    source: 'probe',
  };
}

function buildGeneratePayload(
  provider: LLMProvider,
  prompt: string,
  model: string,
  systemPrompt: string | undefined,
  options: GenerateOptions | undefined
) {
  const {
    maxTokens = 4096,
    temperature = 0.7,
    topP = 1,
    topK,
    frequencyPenalty,
    presencePenalty,
    seed,
    enableThinking = false,
    thinkingSupported = false,
  } = options || {};

  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: prompt },
  ];

  const effectiveMaxTokens = provider === 'openrouter'
    ? clampOpenRouterMaxTokens(
      prompt,
      maxTokens,
      options?.maxContextTokens,
      options?.maxCompletionTokens
    )
    : Math.max(1, Math.floor(maxTokens));

  const payload: Record<string, unknown> = {
    model,
    messages,
    max_tokens: effectiveMaxTokens,
    temperature,
    top_p: topP,
  };

  if (typeof topK === 'number') payload.top_k = topK;
  if (typeof frequencyPenalty === 'number') payload.frequency_penalty = frequencyPenalty;
  if (typeof presencePenalty === 'number') payload.presence_penalty = presencePenalty;
  if (typeof seed === 'number') payload.seed = seed;

  const supported = new Set(
    (options?.supportedParameters || []).map((entry) => entry.toLowerCase())
  );
  const hasSupportMap = supported.size > 0;
  const keep = (name: string) => !hasSupportMap || supported.has(name.toLowerCase());
  const maybeDelete = (key: string, supportKey: string) => {
    if (!keep(supportKey)) {
      delete payload[key];
    }
  };

  maybeDelete('top_k', 'top_k');
  maybeDelete('frequency_penalty', 'frequency_penalty');
  maybeDelete('presence_penalty', 'presence_penalty');
  maybeDelete('seed', 'seed');

  const thinkingBudget = options?.thinkingBudget;
  if (typeof thinkingBudget === 'number' && keep('reasoning') && provider === 'openrouter') {
    payload.reasoning = { max_tokens: Math.max(0, Math.min(Math.floor(thinkingBudget), effectiveMaxTokens)) };
  }

  if (
    provider === 'nim' &&
    enableThinking &&
    thinkingSupported &&
    keep('thinking') &&
    !modelRejectsChatTemplateKwargs(model)
  ) {
    payload.chat_template_kwargs = { thinking: true };
  }

  return payload;
}

export async function* generateStream(
  provider: LLMProvider,
  prompt: string,
  model: string,
  apiKey: string,
  systemPrompt?: string,
  options?: GenerateOptions,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const {
    enableThinking = false,
    thinkingSupported = false,
    timeout,
    inactivityTimeout,
    maxRetries = 2,
    retryDelay = 3000,
    retryableErrors = [502, 503, 504],
    onRetry,
    onError,
  } = options || {};

  const resolvedInactivityTimeout = Math.max(
    0,
    inactivityTimeout ??
      timeout ??
      (enableThinking && thinkingSupported ? 10 * 60 * 1000 : 5 * 60 * 1000)
  );

  let lastError: unknown = null;
  let attemptOptions: GenerateOptions | undefined = options ? { ...options } : undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const onExternalAbort = () => controller.abort();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const resetTimeout = () => {
      if (resolvedInactivityTimeout <= 0) {
        return;
      }
      if (timeoutId) clearTimeout(timeoutId);
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
        Accept: 'text/event-stream',
      };
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey.trim()}`;
      }

      const payload = buildGeneratePayload(provider, prompt, model, systemPrompt, attemptOptions);
      const response = await fetch(getGenerateUrl(provider), {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      resetTimeout();
      if (!response.ok) {
        if (response.status === 429) throw new Error('Rate limit exceeded');
        if (response.status === 401) throw new Error('Invalid API key');
        throw new ProviderHttpError(
          response.status,
          `${provider.toUpperCase()} API Error (${response.status}): ${(await response.text()).slice(0, 200)}`
        );
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

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
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            if (json.error) {
              const message = json.error.message || json.error.type || 'Unknown API error';
              throw new Error(`API Error: ${message}`);
            }

            const content =
              json.choices?.[0]?.delta?.content ??
              json.choices?.[0]?.message?.content ??
              json.content ??
              json.text;

            if (content) yield content;
          } catch (parseError) {
            if (parseError instanceof Error && parseError.message.startsWith('API Error:')) {
              throw parseError;
            }
            onError?.(parseError, trimmed);
          }
        }
      }

      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed !== 'data: [DONE]' && trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignore trailing parse errors from partial buffer endings.
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
        provider === 'openrouter' &&
        normalizedError instanceof ProviderHttpError &&
        normalizedError.status === 400 &&
        attempt < maxRetries
      ) {
        const hint = parseOpenRouterContextError(normalizedError.message);
        if (hint) {
          const currentMaxTokens = Math.max(
            1,
            Math.floor(attemptOptions?.maxTokens ?? options?.maxTokens ?? 4096)
          );
          const estimatedInput = hint.inputTokens ?? estimateTokenCount(prompt);
          const safeByContext = Math.max(1, hint.maxContextTokens - estimatedInput - 256);
          const safeByRequested = hint.requestedOutputTokens
            ? Math.max(1, hint.requestedOutputTokens - 1)
            : safeByContext;
          const nextMaxTokens = Math.max(1, Math.min(safeByContext, safeByRequested));

          if (nextMaxTokens < currentMaxTokens) {
            attemptOptions = {
              ...(attemptOptions || {}),
              maxTokens: nextMaxTokens,
              thinkingBudget: typeof attemptOptions?.thinkingBudget === 'number'
                ? Math.min(attemptOptions.thinkingBudget, nextMaxTokens)
                : attemptOptions?.thinkingBudget,
            };

            onRetry?.(
              attempt + 1,
              maxRetries,
              0,
              new Error(`OpenRouter context overflow; reducing max_tokens ${currentMaxTokens} -> ${nextMaxTokens}`)
            );
            continue;
          }
        }
      }

      if (
        (isRetryableError(normalizedError, retryableErrors) || isTimeoutError(normalizedError)) &&
        attempt < maxRetries
      ) {
        const nextAttempt = attempt + 1;
        const delay = retryDelay * Math.pow(2, attempt);
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
      if (signal) signal.removeEventListener('abort', onExternalAbort);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown generation error');
}
