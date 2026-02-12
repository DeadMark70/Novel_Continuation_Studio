import { NextResponse } from 'next/server';
import { sanitizeLogValue } from '@/lib/server-log-sanitizer';

const NIM_API_BASE = 'https://integrate.api.nvidia.com/v1';

export async function GET(request: Request) {
  // Priority: 1. Header (UI Override) 2. Env Var
  const authHeader = request.headers.get('Authorization');
  const apiKey = authHeader ? authHeader.replace('Bearer ', '') : process.env.NIM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key is required' }, { status: 401 });
  }

  try {
    const response = await fetch(`${NIM_API_BASE}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `NIM API Error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Model fetch error:', sanitizeLogValue(error));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
