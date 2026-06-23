import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ENGINE_URL = process.env.LLOYD_ENGINE_URL ?? 'https://lloyd-platform.vercel.app';

/**
 * Shell-side proxy to the hosted Lloyd engine. The browser talks to this
 * same-origin route; we attach the entitlement key (kept server-side, never
 * exposed) and forward to the engine's onboarding brain. The customer's own
 * model key, if they've added one, is passed through for the engine to use.
 */
export async function POST(req: Request) {
  const key = process.env.LLOYD_ENTITLEMENT_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: 'This shell has no entitlement key configured yet.' },
      { status: 503 },
    );
  }

  let body: { messages?: unknown; customerApiKey?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  try {
    const res = await fetch(`${ENGINE_URL}/api/lloyd-chat`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: body.messages,
        customerApiKey: body.customerApiKey,
        model: body.model,
      }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({ error: 'engine error' }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Could not reach the Lloyd engine.' }, { status: 502 });
  }
}
