import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ENGINE_URL = process.env.LLOYD_ENGINE_URL ?? 'https://lloyd-platform.vercel.app';

/** Same-origin proxy → engine /api/connections, attaching the entitlement key. */
async function forward(method: string, search: string, body?: unknown): Promise<Response> {
  const key = process.env.LLOYD_ENTITLEMENT_KEY?.trim();
  if (!key) return NextResponse.json({ error: 'no entitlement key' }, { status: 503 });
  try {
    const res = await fetch(`${ENGINE_URL}/api/connections${search}`, {
      method,
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'could not reach engine' }, { status: 502 });
  }
}

export async function GET() {
  return forward('GET', '');
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return forward('POST', '', body);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  return forward('DELETE', `?id=${encodeURIComponent(id)}`);
}
