import { NextResponse } from 'next/server';
import { isOpenRouterNetworkDisabled } from '@/lib/openrouter-guard';

const OPENROUTER_API_BASE = 'https://openrouter.ai/api/v1';

function normalizeSupportedParameters(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((value): value is string => typeof value === 'string');
}

export async function GET(request: Request) {
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
    const response = await fetch(`${OPENROUTER_API_BASE}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `OpenRouter API Error: ${errorText}` }, { status: response.status });
    }

    const raw = await response.json() as { data?: Array<Record<string, unknown>> };
    const data = (raw.data || []).map((model) => ({
      id: String(model.id ?? ''),
      object: 'model' as const,
      created: typeof model.created === 'number' ? model.created : Date.now(),
      owned_by: 'openrouter',
      name: typeof model.name === 'string' ? model.name : undefined,
      supportedParameters: normalizeSupportedParameters(
        model.supported_parameters ?? model.supportedParameters
      ),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('OpenRouter model fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
