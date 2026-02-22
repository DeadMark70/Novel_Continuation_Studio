import { NextResponse } from 'next/server';
import { sanitizeLogValue } from '@/lib/server-log-sanitizer';

const NIM_API_BASE = 'https://integrate.api.nvidia.com/v1';
export const maxDuration = 300;

function isChatTemplateUnsupportedError(status: number, errorText: string): boolean {
  if (status !== 400 && status !== 422) {
    return false;
  }
  const normalized = errorText.toLowerCase();
  return (
    normalized.includes('chat_template') &&
    normalized.includes('not supported')
  );
}

export async function POST(request: Request) {
  // TODO: Replace with Session/Cookie auth for production multi-user deployments.
  const unsafeLocalBypass = process.env.ALLOW_UNSAFE_LOCAL?.toLowerCase() === 'true'
    && process.env.NODE_ENV !== 'production';
  if (!unsafeLocalBypass) {
    const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
    if (!internalSecret) {
      return NextResponse.json(
        { error: 'Server misconfiguration: INTERNAL_API_SECRET is required.' },
        { status: 500 }
      );
    }
    const providedSecret = request.headers.get('X-API-Secret')?.trim();
    if (!providedSecret || providedSecret !== internalSecret) {
      return NextResponse.json(
        { error: 'Forbidden: invalid internal API secret.' },
        { status: 403 }
      );
    }
  }

  const authHeader = request.headers.get('Authorization');
  const apiKey = authHeader ? authHeader.replace('Bearer ', '') : process.env.NIM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key is required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      model,
      messages,
      max_tokens,
      temperature,
      top_p,
      frequency_penalty,
      presence_penalty,
      seed,
      chat_template_kwargs,
    } = body as {
      model: string;
      messages: unknown;
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
      seed?: number;
      chat_template_kwargs?: Record<string, unknown>;
    };

    const payload: {
      model: string;
      messages: unknown;
      stream: boolean;
      max_tokens: number;
      temperature: number;
      top_p: number;
      frequency_penalty?: number;
      presence_penalty?: number;
      seed?: number;
      chat_template_kwargs?: Record<string, unknown>;
    } = {
      model,
      messages,
      stream: true,
      max_tokens: max_tokens || 4096,
      temperature: temperature || 0.7,
      top_p: top_p || 1,
    };

    if (typeof frequency_penalty === 'number') {
      payload.frequency_penalty = frequency_penalty;
    }
    if (typeof presence_penalty === 'number') {
      payload.presence_penalty = presence_penalty;
    }
    if (typeof seed === 'number') {
      payload.seed = seed;
    }
    if (chat_template_kwargs && typeof chat_template_kwargs === 'object') {
      payload.chat_template_kwargs = chat_template_kwargs;
    }

    const upstreamHeaders = {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };

    let response = await fetch(`${NIM_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (
        payload.chat_template_kwargs &&
        isChatTemplateUnsupportedError(response.status, errorText)
      ) {
        const downgradedPayload = { ...payload };
        delete downgradedPayload.chat_template_kwargs;

        response = await fetch(`${NIM_API_BASE}/chat/completions`, {
          method: 'POST',
          headers: upstreamHeaders,
          body: JSON.stringify(downgradedPayload),
        });

        if (!response.ok) {
          const fallbackErrorText = await response.text();
          return NextResponse.json(
            { error: `NIM API Error: ${fallbackErrorText}` },
            { status: response.status }
          );
        }
      } else {
        return NextResponse.json({ error: `NIM API Error: ${errorText}` }, { status: response.status });
      }
    }

    // Proxy the stream
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Generation error:', sanitizeLogValue(error));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
