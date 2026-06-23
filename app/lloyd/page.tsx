import Link from 'next/link';
import { getCatalog, getEntitlement } from '@/lib/engine';
import { LloydChat } from '@/components/LloydChat';

export const dynamic = 'force-dynamic';

export default async function LloydPage() {
  const ent = await getEntitlement();

  if (ent.status === 'missing') {
    return (
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Almost there</h1>
        <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          Add your <code>LLOYD_ENTITLEMENT_KEY</code> to this project’s environment variables and
          redeploy — then Lloyd will be ready to talk.
        </p>
        <Link href="/" style={{ color: 'var(--accent)' }}>
          ← Back
        </Link>
      </main>
    );
  }

  // Catalogue powers the inline "Connect tools" drawer. Empty is fine — chat
  // still works; Lloyd just can't list connectors.
  const { connectors } = await getCatalog();

  return <LloydChat connectors={connectors} />;
}
