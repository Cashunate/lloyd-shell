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
  /** Plan name reported by the engine when the key is valid. */
  plan?: string;
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
  try {
    const res = await fetch(`${ENGINE_URL}/api/entitlement`, {
      headers: { authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as { valid?: boolean; planName?: string };
      return {
        status: data.valid ? 'active' : 'unverified',
        keyHint: keyHint(key),
        engineUrl: ENGINE_URL,
        plan: data.planName,
      };
    }
  } catch {
    /* engine unreachable — report unverified rather than crash the shell */
  }
  return { status: 'unverified', keyHint: keyHint(key), engineUrl: ENGINE_URL };
}

/** Fetch the connector catalogue from the engine (entitlement-gated). */
export async function getCatalog(): Promise<{ ok: boolean; connectors: CatalogConnector[] }> {
  const key = process.env.LLOYD_ENTITLEMENT_KEY?.trim();
  if (!key) return { ok: false, connectors: [] };
  try {
    const res = await fetch(`${ENGINE_URL}/api/catalog`, {
      headers: { authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, connectors: [] };
    const data = (await res.json()) as { connectors?: CatalogConnector[] };
    return { ok: true, connectors: data.connectors ?? [] };
  } catch {
    return { ok: false, connectors: [] };
  }
}

export interface CatalogCredential {
  key: string;
  label: string;
  envVar: string;
  help?: string;
  docsUrl?: string;
  required?: boolean;
  secret?: boolean;
}

export interface CatalogConnector {
  id: string;
  name: string;
  description: string;
  provider?: string;
  website?: string;
  category?: string;
  kind: 'native' | 'mcp' | 'custom';
  tagline?: string;
  credentials: CatalogCredential[];
  built: boolean;
}
