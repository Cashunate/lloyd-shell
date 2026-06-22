import { NextResponse } from 'next/server';
import { getEntitlement } from '@/lib/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness + entitlement probe. Safe to expose — never returns the key. */
export async function GET() {
  const ent = await getEntitlement();
  return NextResponse.json({
    ok: true,
    shell: 'lloyd-shell',
    entitlement: ent.status,
    keyConfigured: ent.status !== 'missing',
  });
}
