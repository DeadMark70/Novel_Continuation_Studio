import { NextResponse } from 'next/server';
import { sanitizeLogValue } from '@/lib/server-log-sanitizer';

const NIM_API_BASE = 'https://integrate.api.nvidia.com/v1';

type ProbeStatus = {
  ok: boolean;
  status?: number;
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
    return { ok: false, status: response.status, reason: `HTTP ${response.status}: ${message}` };
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

function isDefinitiveThinkingUnsupported(probe: ProbeStatus): boolean {
  if (probe.ok) {
    return false;
  }

  if (probe.status !== 400 && probe.status !== 422) {
    return false;
  }

  const reason = probe.reason?.toLowerCase() ?? '';
  if (!reason) {
    return true;
  }

  return (
    reason.includes('thinking') ||
    reason.includes('chat_template_kwargs') ||
    reason.includes('unsupported') ||
    reason.includes('unknown field') ||
    reason.includes('invalid field')
  );
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
      if (chatProbe.status === 429) {
        return NextResponse.json({
          chatSupported: true,
          thinkingSupported: 'unknown',
          reason: 'Capability probe rate-limited (HTTP 429). Please retry shortly.',
          checkedAt: Date.now(),
          source: 'probe',
        });
      }

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

    if (!thinkingProbe.ok) {
      if (thinkingProbe.status === 429) {
        return NextResponse.json({
          chatSupported: true,
          thinkingSupported: 'unknown',
          reason: 'Thinking capability probe rate-limited (HTTP 429). Please retry shortly.',
          checkedAt: Date.now(),
          source: 'probe',
        });
      }

      const isUnsupported = isDefinitiveThinkingUnsupported(thinkingProbe);
      return NextResponse.json({
        chatSupported: true,
        thinkingSupported: isUnsupported ? 'unsupported' : 'unknown',
        reason: thinkingProbe.reason,
        checkedAt: Date.now(),
        source: 'probe',
      });
    }

    return NextResponse.json({
      chatSupported: true,
      thinkingSupported: 'supported',
      reason: undefined,
      checkedAt: Date.now(),
      source: 'probe',
    });
  } catch (error) {
    console.error('Capability probe error:', sanitizeLogValue(error));
    return NextResponse.json({
      chatSupported: true,
      thinkingSupported: 'unknown',
      reason: error instanceof Error ? error.message : 'Capability probe failed',
      checkedAt: Date.now(),
      source: 'probe',
    });
  }
}
