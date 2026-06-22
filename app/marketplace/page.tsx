import Link from 'next/link';
import { getCatalog, getEntitlement } from '@/lib/engine';
import { Marketplace } from '@/components/Marketplace';

export const dynamic = 'force-dynamic';

export default async function MarketplacePage() {
  const ent = await getEntitlement();
  const { ok, connectors } = await getCatalog();

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 80px' }}>
      <Link href="/" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
        ← Back to your shell
      </Link>

      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em', margin: '18px 0 6px' }}>
        Connector marketplace
      </h1>
      <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 620 }}>
        Plug in the tools your team uses — you bring your own keys, so Lloyd acts as you. Credentials
        stay here, with you. Anything niche? Use a universal connector (MCP, custom API or webhook).
      </p>

      {ent.status === 'missing' ? (
        <Notice
          title="Add your entitlement key first"
          body="Set LLOYD_ENTITLEMENT_KEY in this project’s environment variables, then redeploy — the marketplace loads from the Lloyd engine once your key is in place."
        />
      ) : !ok ? (
        <Notice
          title="Couldn’t reach the engine"
          body={`The shell couldn’t load the catalogue from ${ent.engineUrl}. Check that your entitlement key is valid, then refresh.`}
        />
      ) : (
        <Marketplace connectors={connectors} />
      )}
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--border)',
        borderRadius: 14,
        padding: 22,
        color: 'var(--muted)',
      }}
    >
      <div style={{ color: 'var(--text)', fontWeight: 500, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}
