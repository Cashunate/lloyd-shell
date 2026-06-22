/**
 * The shell's link to the hosted Lloyd engine.
 *
 * Architecture: the BRAIN (orchestration, prompts, memory) is hosted by Lloyd
 * and gated by your entitlement key; the HANDS (this shell, your connectors,
 * your data) run on your own infrastructure. This module is the seam — it
 * presents your entitlement key to the engine and reports whether you're live.
 */

export type EntitlementStatus = 'active' | 'missing' | 'unverified';

export interface Entitlement {
  status: EntitlementStatus;
  /** Never the full key — just enough to confirm which key is configured. */
  keyHint: string | null;
  engineUrl: string;
}

const ENGINE_URL = process.env.LLOYD_ENGINE_URL ?? 'https://lloyd-platform.vercel.app';

function keyHint(key: string): string {
  if (key.length <= 12) return `${key.slice(0, 4)}…`;
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}

/**
 * Resolve the current entitlement. Today this is a local presence check; once
 * the engine's public entitlement endpoint is live this will verify the key
 * against it (and the engine refuses to think without a valid one — that's the
 * kill-switch). The interface is stable so wiring the real call is a one-liner.
 */
export async function getEntitlement(): Promise<Entitlement> {
  const key = process.env.LLOYD_ENTITLEMENT_KEY?.trim();
  if (!key) {
    return { status: 'missing', keyHint: null, engineUrl: ENGINE_URL };
  }

  // TODO(engine): replace with a real call once the endpoint ships, e.g.
  //   const res = await fetch(`${ENGINE_URL}/api/entitlement`, {
  //     headers: { authorization: `Bearer ${key}` }, cache: 'no-store',
  //   });
  //   return { status: res.ok ? 'active' : 'unverified', keyHint: keyHint(key), engineUrl: ENGINE_URL };
  return { status: 'unverified', keyHint: keyHint(key), engineUrl: ENGINE_URL };
}
