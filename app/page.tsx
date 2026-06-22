import Link from 'next/link';
import { getEntitlement } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const ent = await getEntitlement();
  const connected = ent.status !== 'missing';

  const badge =
    ent.status === 'active'
      ? { label: 'Engine connected', color: '#39d98a', bg: 'rgba(57,217,138,0.12)' }
      : ent.status === 'unverified'
        ? { label: 'Key set — awaiting engine', color: '#f5b94a', bg: 'rgba(245,185,74,0.12)' }
        : { label: 'No entitlement key', color: '#8a97a8', bg: 'rgba(138,151,168,0.12)' };

  return (
    <main
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '72px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <span
          style={{
            display: 'inline-block',
            height: 22,
            width: 22,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #7fc8ff, #2f6fe0 55%, #16204a)',
          }}
        />
        <span style={{ fontSize: 20, fontWeight: 600 }}>Lloyd</span>
        <span
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Shell
        </span>
      </div>

      <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 12px' }}>
        Your Lloyd shell is running.
      </h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 24px' }}>
        This app runs on your infrastructure and holds your data and connector credentials. The
        thinking — orchestration, memory, model routing — lives in the hosted Lloyd engine, switched
        on by your entitlement key.
      </p>

      <span
        style={{
          display: 'inline-block',
          padding: '5px 12px',
          borderRadius: 999,
          fontSize: 13,
          color: badge.color,
          background: badge.bg,
          marginBottom: 28,
        }}
      >
        ● {badge.label}
        {ent.keyHint ? <span style={{ color: 'var(--muted)' }}>  ·  {ent.keyHint}</span> : null}
      </span>

      <ol style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 12 }}>
        <Step
          n={1}
          done={connected}
          title="Add your entitlement key"
          body={
            connected
              ? 'Detected. Your shell is authorised to reach the engine.'
              : 'Set LLOYD_ENTITLEMENT_KEY in this project’s environment variables (Vercel → Settings → Environment Variables), then redeploy.'
          }
        />
        <Step
          n={2}
          done={false}
          title="Connect your stack"
          body="Bring your own keys for the tools you use — HubSpot, Slack, Teams, Google or Microsoft, and more. Credentials stay here, with you."
          action={connected ? { href: '/marketplace', label: 'Open the marketplace →' } : undefined}
        />
        <Step
          n={3}
          done={false}
          title="Customise with Claude Code"
          body="This repo is yours. Open it in Claude Code and tailor Lloyd’s surfaces and connectors to how your team works."
        />
      </ol>

      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 32 }}>
        Health check: <code style={{ color: 'var(--text)' }}>/api/health</code> · Engine:{' '}
        <code style={{ color: 'var(--text)' }}>{ent.engineUrl}</code>
      </p>
    </main>
  );
}

function Step({
  n,
  done,
  title,
  body,
  action,
}: {
  n: number;
  done: boolean;
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <li
      style={{
        border: '1px solid var(--border)',
        background: done ? 'rgba(79,157,255,0.05)' : 'var(--panel)',
        borderRadius: 16,
        padding: 18,
        display: 'flex',
        gap: 14,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          height: 28,
          width: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          border: '1px solid var(--border)',
          color: done ? '#0a0e14' : 'var(--accent)',
          background: done ? 'var(--accent)' : 'transparent',
        }}
      >
        {done ? '✓' : n}
      </span>
      <div>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>{title}</div>
        <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.55 }}>{body}</div>
        {action && (
          <Link
            href={action.href}
            style={{
              display: 'inline-block',
              marginTop: 12,
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 500,
              background: '#fff',
              color: '#000',
              textDecoration: 'none',
            }}
          >
            {action.label}
          </Link>
        )}
      </div>
    </li>
  );
}
