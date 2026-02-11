import { NextResponse } from 'next/server';
import { isOpenRouterNetworkDisabled } from '@/lib/openrouter-guard';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';
export const maxDuration = 300;

type OpenRouterGeneratePayload = {
  model: string;
  messages: unknown;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
};

export async function POST(request: Request) {
  if (isOpenRouterNetworkDisabled()) {
    return NextResponse.json(
      { error: 'OpenRouter network calls are disabled in this environment.' },
      { status: 403 }
    );
  }

  const authHeader = request.headers.get('Authorization');
  const apiKey = authHeader ? authHeader.replace('Bearer ', '') : process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key is required' }, { status: 401 });
  }

  try {
    const body = await request.json() as OpenRouterGeneratePayload;
    const payload: Record<string, unknown> = {
      model: body.model,
      messages: body.messages,
      stream: true,
      max_tokens: body.max_tokens ?? 4096,
      temperature: body.temperature ?? 0.7,
      top_p: body.top_p ?? 1,
    };

    if (typeof body.top_k === 'number') payload.top_k = body.top_k;
    if (typeof body.frequency_penalty === 'number') payload.frequency_penalty = body.frequency_penalty;
    if (typeof body.presence_penalty === 'number') payload.presence_penalty = body.presence_penalty;
    if (typeof body.seed === 'number') payload.seed = body.seed;

    const headers: HeadersInit = {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };

    if (process.env.OPENROUTER_SITE_URL) {
      headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL;
    }
    if (process.env.OPENROUTER_SITE_NAME) {
      headers['X-Title'] = process.env.OPENROUTER_SITE_NAME;
    }

    const response = await fetch(`${OPENROUTER_API_BASE}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OpenRouter API Error: ${errorText}` },
        { status: response.status }
      );
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('OpenRouter generation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
