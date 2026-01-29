export interface NimModel {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeout?: number;  // ms
  onError?: (error: unknown, context?: string) => void;
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
    timeout = 60000,
    onError
  } = options || {};

  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: prompt }
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // Merge signals: either timeout or external user cancel
  const mergedSignal = signal || controller.signal;
  
  // If external signal is provided, we need to listen to it to abort our controller too
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
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
      }),
      signal: mergedSignal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) throw new Error('Rate limit exceeded');
      if (response.status === 401) throw new Error('Invalid API key');
      const errorText = await response.text();
      throw new Error(`NIM API Error (${response.status}): ${errorText.slice(0, 200)}`);
    }

    if (!response.body) throw new Error('Response body is null');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      if (mergedSignal.aborted) {
        reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch (e) {
            onError?.(e, trimmed);
            console.warn('Failed to parse SSE:', trimmed);
          }
        }
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request cancelled or timed out');
    }
    throw error;
  }
}