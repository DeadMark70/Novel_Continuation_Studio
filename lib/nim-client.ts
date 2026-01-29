export interface NimModel {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

export interface NimCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }[];
}

const NIM_API_BASE = 'https://integrate.api.nvidia.com/v1';

export async function fetchModels(apiKey: string): Promise<NimModel[]> {
  if (!apiKey) throw new Error('API Key is required');

  const response = await fetch(`${NIM_API_BASE}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function* generateStream(
  prompt: string,
  model: string,
  apiKey: string,
  systemPrompt?: string
): AsyncGenerator<string, void, unknown> {
  if (!apiKey) throw new Error('API Key is required');

  const messages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: prompt }
  ];

  const response = await fetch(`${NIM_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      max_tokens: 4096, // Reasonable default for novel writing
      temperature: 0.7,
      top_p: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NIM API Error: ${response.status} ${errorText}`);
  }

  if (!response.body) throw new Error('Response body is null');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch (e) {
          console.warn('Failed to parse SSE message:', trimmed, e);
        }
      }
    }
  }
}
