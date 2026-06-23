import Link from 'next/link';
import { getConnections, getUsage } from '@/lib/engine';

export const dynamic = 'force-dynamic';

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function UsagePage() {
  const [connections, usage] = await Promise.all([getConnections(), getUsage()]);

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        <Link href="/lloyd" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
          ← Lloyd
        </Link>
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 600, margin: '6px 0 6px' }}>Usage & connections</h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 28px' }}>
        Your live integrations and what you’ve consumed this period. You pay for your own usage —
        bring your own model key to run on your own account.
      </p>

      {/* Usage */}
      <section style={{ marginBottom: 34 }}>
        <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
          This period {usage?.periodMonth ? `· ${usage.periodMonth}` : ''}
        </h2>
        {usage ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 12 }}>
              <Stat label="Spend" value={dollars(usage.costCents)} sub={`of ${dollars(usage.capCents)} included`} tone={usage.withinCap ? 'ok' : 'warn'} />
              <Stat label="Overage" value={dollars(usage.overageCents)} sub="billed on top" />
              <Stat label="Tokens" value={`${((usage.tokensIn + usage.tokensOut) / 1000).toFixed(1)}k`} sub="in + out" />
              <Stat label="Web searches" value={String(usage.webSearches)} />
            </div>
            <div style={{ marginTop: 14, height: 6, borderRadius: 6, background: 'var(--border)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, usage.capCents ? (usage.costCents / usage.capCents) * 100 : 0)}%`,
                  background: usage.withinCap ? 'var(--accent)' : '#f5b94a',
                }}
              />
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 10 }}>
            Usage isn’t available yet. (Connect storage on the engine to start metering.)
          </p>
        )}
      </section>

      {/* Connections */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', margin: 0 }}>
            Connected ({connections.length})
          </h2>
          <Link href="/lloyd" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
            + Connect more
          </Link>
        </div>
        {connections.length === 0 ? (
          <div style={{ border: '1px dashed var(--border)', borderRadius: 14, padding: 22, color: 'var(--muted)', fontSize: 14 }}>
            Nothing connected yet. Open Lloyd and hit “Connect tools” — he’ll walk you through any
            platform, native or not.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {connections.map((c) => (
              <div
                key={c.connectorId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--panel)',
                  borderRadius: 12,
                  padding: '12px 16px',
                }}
              >
                <span style={{ height: 8, width: 8, borderRadius: '50%', background: '#39d98a' }} />
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                {c.category && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{c.category}</span>}
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: c.built ? 'var(--accent)' : 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 999,
                    padding: '2px 8px',
                  }}
                >
                  {c.built ? 'Live' : 'Connected'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' }) {
  return (
    <div style={{ border: '1px solid var(--border)', background: 'var(--panel)', borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4, color: tone === 'warn' ? '#f5b94a' : 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}
