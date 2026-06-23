'use client';

import { useEffect, useRef, useState } from 'react';
import { Marketplace } from './Marketplace';
import type { CatalogConnector } from '@/lib/engine';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const KEY_STORE = 'lloyd_customer_anthropic_key';
const SEED = 'Hi — I just signed up. Help me get set up.';

export function LloydChat({ connectors }: { connectors: CatalogConnector[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [keyPanel, setKeyPanel] = useState(false);
  const [customerKey, setCustomerKey] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // Load any saved model key, then kick off Lloyd's opening message once.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY_STORE);
      if (saved) setCustomerKey(saved);
    } catch {
      /* ignore */
    }
    if (!started.current) {
      started.current = true;
      void send(SEED, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string, isSeed = false) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next: Msg[] = [...messages, { role: 'user', content: clean }];
    setMessages(next);
    setInput('');
    setBusy(true);
    let savedKey = '';
    try {
      savedKey = localStorage.getItem(KEY_STORE) ?? '';
    } catch {
      /* ignore */
    }
    try {
      const res = await fetch('/api/lloyd', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          ...(savedKey ? { customerApiKey: savedKey } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.text || `⚠ ${data.error || 'Something went wrong.'}` },
      ]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: '⚠ Could not reach Lloyd.' }]);
    } finally {
      setBusy(false);
    }
    void isSeed;
  }

  function saveKey() {
    try {
      if (customerKey.trim()) localStorage.setItem(KEY_STORE, customerKey.trim());
      else localStorage.removeItem(KEY_STORE);
    } catch {
      /* ignore */
    }
    setKeyPanel(false);
  }

  const hasKey = customerKey.trim().startsWith('sk-ant-');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: 820, margin: '0 auto' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            height: 22,
            width: 22,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #7fc8ff, #2f6fe0 55%, #16204a)',
            boxShadow: busy ? '0 0 14px 2px rgba(79,157,255,0.6)' : 'none',
            transition: 'box-shadow 0.4s',
          }}
        />
        <span style={{ fontSize: 17, fontWeight: 600 }}>Lloyd</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setKeyPanel(true)} style={ghostBtn}>
            {hasKey ? '● Your key' : 'Model key'}
          </button>
          <button onClick={() => setDrawer(true)} style={ghostBtn}>
            Connect tools
          </button>
        </span>
      </header>

      {/* Messages */}
      <div ref={scroller} style={{ flex: 1, overflowY: 'auto', padding: '22px 18px' }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 10,
              marginBottom: 18,
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            {m.role === 'assistant' && (
              <span
                style={{
                  flexShrink: 0,
                  height: 26,
                  width: 26,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 30% 30%, #7fc8ff, #2f6fe0 55%, #16204a)',
                }}
              />
            )}
            <div
              style={{
                maxWidth: '78%',
                borderRadius: 14,
                padding: '11px 15px',
                fontSize: 15,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                background: m.role === 'user' ? 'var(--accent)' : 'var(--panel)',
                color: m.role === 'user' ? '#04121f' : 'var(--text)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border)',
              }}
            >
              {renderText(m.content)}
            </div>
          </div>
        ))}
        {busy && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <span
              style={{
                flexShrink: 0,
                height: 26,
                width: 26,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #7fc8ff, #2f6fe0 55%, #16204a)',
              }}
            />
            <div style={{ color: 'var(--muted)', fontSize: 14, padding: '11px 4px' }}>
              <span className="lloyd-typing">Lloyd is thinking…</span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{ display: 'flex', gap: 10, padding: '14px 18px', borderTop: '1px solid var(--border)' }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Message Lloyd…"
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 14px',
            color: 'var(--text)',
            fontSize: 15,
            fontFamily: 'inherit',
            outline: 'none',
            maxHeight: 140,
          }}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          style={{
            borderRadius: 12,
            padding: '0 20px',
            background: '#fff',
            color: '#000',
            fontWeight: 600,
            fontSize: 14,
            border: 'none',
            cursor: busy || !input.trim() ? 'default' : 'pointer',
            opacity: busy || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>

      {/* Connect drawer */}
      {drawer && (
        <Overlay onClose={() => setDrawer(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              marginLeft: 'auto',
              height: '100%',
              width: 'min(680px, 94vw)',
              background: 'var(--bg)',
              borderLeft: '1px solid var(--border)',
              padding: '20px 22px',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Connect your tools</h2>
              <button onClick={() => setDrawer(false)} style={{ ...ghostBtn, marginLeft: 'auto' }}>
                Done
              </button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>
              Bring your own keys — Lloyd acts as you. Ask Lloyd in the chat if you need help finding a key.
            </p>
            <Marketplace connectors={connectors} />
          </div>
        </Overlay>
      )}

      {/* Model key panel */}
      {keyPanel && (
        <Overlay onClose={() => setKeyPanel(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              margin: 'auto',
              width: 'min(440px, 92vw)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 22,
            }}
          >
            <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>Use your own model key</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, marginTop: 0 }}>
              By default Lloyd runs on a shared key so you can start instantly. Paste your own
              Anthropic key (<code>sk-ant-…</code>) to run on your own account — your usage, your
              control. Get one at{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                console.anthropic.com
              </a>
              .
            </p>
            <input
              type="password"
              value={customerKey}
              onChange={(e) => setCustomerKey(e.target.value)}
              placeholder="sk-ant-…"
              style={{
                width: '100%',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 12px',
                color: 'var(--text)',
                fontSize: 13,
                outline: 'none',
                marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveKey} style={{ flex: 1, borderRadius: 8, padding: '10px 0', background: '#fff', color: '#000', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Save
              </button>
              <button onClick={() => setKeyPanel(false)} style={{ ...ghostBtn, padding: '10px 16px' }}>
                Cancel
              </button>
            </div>
          </div>
        </Overlay>
      )}

      <style>{`@keyframes lloydblink {0%,100%{opacity:0.35}50%{opacity:1}} .lloyd-typing{animation:lloydblink 1.2s ease-in-out infinite}`}</style>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 13,
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  cursor: 'pointer',
};

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        zIndex: 60,
      }}
    >
      {children}
    </div>
  );
}

/** Light markdown: **bold** and numbered/bulleted lines kept as text. */
function renderText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
  );
}
