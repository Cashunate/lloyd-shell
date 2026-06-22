'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CatalogConnector } from '@/lib/engine';

const STORE_KEY = 'lloyd_shell_connections';

/**
 * The connector marketplace. The catalogue comes from the hosted engine; the
 * customer brings their own credentials, which in this build are captured to
 * demonstrate the flow and the connection state is kept locally. (Production
 * stores credentials server-side, encrypted per-tenant — secret values are
 * never persisted in the browser here.)
 */
export function Marketplace({ connectors }: { connectors: CatalogConnector[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');
  const [connected, setConnected] = useState<string[]>([]);
  const [active, setActive] = useState<CatalogConnector | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setConnected(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  function persist(next: string[]) {
    setConnected(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    connectors.forEach((c) => c.category && set.add(c.category));
    return ['All', ...Array.from(set).sort()];
  }, [connectors]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return connectors.filter((c) => {
      if (cat !== 'All' && c.category !== cat) return false;
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        (c.tagline ?? '').toLowerCase().includes(needle) ||
        (c.description ?? '').toLowerCase().includes(needle) ||
        (c.provider ?? '').toLowerCase().includes(needle)
      );
    });
  }, [connectors, q, cat]);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 18 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${connectors.length} connectors…`}
          style={{
            flex: 1,
            minWidth: 220,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '10px 14px',
            color: 'var(--text)',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {connected.length} connected
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{
              borderRadius: 999,
              padding: '5px 12px',
              fontSize: 12,
              cursor: 'pointer',
              border: '1px solid ' + (cat === c ? 'var(--accent)' : 'var(--border)'),
              background: cat === c ? 'rgba(79,157,255,0.12)' : 'transparent',
              color: cat === c ? 'var(--accent)' : 'var(--muted)',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        }}
      >
        {filtered.map((c) => {
          const isOn = connected.includes(c.id);
          return (
            <div
              key={c.id}
              style={{
                border: '1px solid ' + (isOn ? 'rgba(57,217,138,0.4)' : 'var(--border)'),
                background: isOn ? 'rgba(57,217,138,0.05)' : 'var(--panel)',
                borderRadius: 14,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</span>
                <span
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: c.built ? 'var(--accent)' : 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 999,
                    padding: '2px 7px',
                  }}
                >
                  {c.built ? 'Native' : c.kind === 'mcp' || c.kind === 'custom' ? 'Universal' : 'Directory'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--muted)', flex: 1 }}>
                {c.tagline || c.description}
              </p>
              <button
                onClick={() => setActive(c)}
                style={{
                  marginTop: 4,
                  borderRadius: 8,
                  padding: '7px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: isOn ? '1px solid rgba(57,217,138,0.4)' : '1px solid var(--border)',
                  background: isOn ? 'transparent' : '#fff',
                  color: isOn ? '#39d98a' : '#000',
                }}
              >
                {isOn ? '✓ Connected' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>
          No connectors match “{q}”.
        </p>
      )}

      {active && (
        <ConnectModal
          connector={active}
          connected={connected.includes(active.id)}
          onClose={() => setActive(null)}
          onConnect={() => {
            if (!connected.includes(active.id)) persist([...connected, active.id]);
            setActive(null);
          }}
          onDisconnect={() => {
            persist(connected.filter((id) => id !== active.id));
            setActive(null);
          }}
        />
      )}
    </div>
  );
}

function ConnectModal({
  connector,
  connected,
  onClose,
  onConnect,
  onDisconnect,
}: {
  connector: CatalogConnector;
  connected: boolean;
  onClose: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const required = connector.credentials.filter((c) => c.required !== false);
  const ready =
    connector.credentials.length === 0 ||
    required.every((c) => (values[c.key] ?? '').trim().length > 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: 22,
        }}
      >
        <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>{connector.name}</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          {connector.description}
        </p>

        {connector.credentials.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            {connector.built
              ? 'No credentials needed — this one is ready to use.'
              : 'Connect this via a universal connector (MCP, custom API or webhook) from within your shell, or request a native build.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {connector.credentials.map((cred) => (
              <label key={cred.key} style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>
                  {cred.label}
                  {cred.required === false ? (
                    <span style={{ color: 'var(--muted)' }}> (optional)</span>
                  ) : null}
                </span>
                <input
                  type={cred.secret === false ? 'text' : 'password'}
                  value={values[cred.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [cred.key]: e.target.value }))}
                  placeholder={cred.envVar}
                  style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '9px 12px',
                    color: 'var(--text)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                {(cred.help || cred.docsUrl) && (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {cred.help}{' '}
                    {cred.docsUrl && (
                      <a href={cred.docsUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                        Where to find it
                      </a>
                    )}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {connected ? (
            <button
              onClick={onDisconnect}
              style={{
                flex: 1,
                borderRadius: 8,
                padding: '10px 0',
                fontSize: 13,
                cursor: 'pointer',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: '#f5736b',
              }}
            >
              Disconnect
            </button>
          ) : null}
          <button
            onClick={onConnect}
            disabled={!ready}
            style={{
              flex: 2,
              borderRadius: 8,
              padding: '10px 0',
              fontSize: 13,
              fontWeight: 500,
              cursor: ready ? 'pointer' : 'default',
              border: 'none',
              background: ready ? '#fff' : 'var(--border)',
              color: ready ? '#000' : 'var(--muted)',
            }}
          >
            {connected ? 'Update connection' : 'Connect'}
          </button>
          <button
            onClick={onClose}
            style={{
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              cursor: 'pointer',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
