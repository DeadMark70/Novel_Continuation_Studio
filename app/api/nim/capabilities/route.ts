import { NextResponse } from 'next/server';

const NIM_API_BASE = 'https://integrate.api.nvidia.com/v1';

type ProbeStatus = {
  ok: boolean;
  reason?: string;
};

type ProbeRequestPayload = {
  model: string;
  messages: Array<{ role: 'user'; content: string }>;
  max_tokens: number;
  temperature: number;
  top_p: number;
  stream: boolean;
  chat_template_kwargs?: { thinking: boolean };
};

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 200);
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function runProbe(apiKey: string, payload: ProbeRequestPayload): Promise<ProbeStatus> {
  const response = await fetch(`${NIM_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    return { ok: false, reason: `HTTP ${response.status}: ${message}` };
  }

  try {
    const data = await response.json() as { error?: { message?: string; type?: string } };
    if (data.error) {
      return { ok: false, reason: data.error.message || data.error.type || 'Unknown API error' };
    }
  } catch {
    // Some upstream responses may not include JSON body for probes; treat HTTP 200 as pass.
  }

  return { ok: true };
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const apiKey = authHeader ? authHeader.replace('Bearer ', '') : process.env.NIM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key is required' }, { status: 401 });
  }

  try {
    const body = await request.json() as { model?: string };
    const model = body.model?.trim();

    if (!model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    const basePayload: ProbeRequestPayload = {
      model,
      messages: [{ role: 'user', content: 'Reply with OK only.' }],
      max_tokens: 8,
      temperature: 0,
      top_p: 1,
      stream: false,
    };

    const chatProbe = await runProbe(apiKey, basePayload);
    if (!chatProbe.ok) {
      return NextResponse.json({
        chatSupported: false,
        thinkingSupported: 'unsupported',
        reason: chatProbe.reason,
        checkedAt: Date.now(),
        source: 'probe',
      });
    }

    const thinkingProbe = await runProbe(apiKey, {
      ...basePayload,
      chat_template_kwargs: { thinking: true },
    });

    return NextResponse.json({
      chatSupported: true,
      thinkingSupported: thinkingProbe.ok ? 'supported' : 'unsupported',
      reason: thinkingProbe.ok ? undefined : thinkingProbe.reason,
      checkedAt: Date.now(),
      source: 'probe',
    });
  } catch (error) {
    console.error('Capability probe error:', error);
    return NextResponse.json({
      chatSupported: true,
      thinkingSupported: 'unknown',
      reason: error instanceof Error ? error.message : 'Capability probe failed',
      checkedAt: Date.now(),
      source: 'probe',
    });
  }
}
