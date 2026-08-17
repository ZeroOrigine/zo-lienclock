import Link from 'next/link';
import JoinRevealObserver from '@/components/JoinRevealObserver';
import { createPublicClient } from '@/lib/supabase/public';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Genome. Every gene the machine has learned | ZeroOrigine',
  description:
    'The public family tree of the ZeroOrigine gene library: every proven module, which product created it, and how often it has been inherited since. Dead products contribute too.',
  openGraph: {
    title: 'The Genome. Every gene the machine has learned',
    description:
      'A living family tree: products leave genes behind, and every product born after inherits them.',
    type: 'website',
    url: 'https://zeroorigine.com/genome',
  },
};

type GenomeRow = {
  module_id: string;
  name: string | null;
  description: string | null;
  module_type: string | null;
  project_origin: string | null;
  times_used: number | null;
  created_at: string;
};

type ProductRow = { name: string; status: string; url: string | null };

// The recorded family tree for the era before gene origins were stamped in the
// database. Source: the genome ledger in ZeroOrigine/zo-genes (TREE.md).
const RECORDED_ERA: { product: string; born: string; genes: string[] }[] = [
  { product: 'GrantMatch', born: '2026-03-22', genes: ['notification_system'] },
  {
    product: 'MeetingCost', born: '2026-03-22',
    genes: ['calendar_integration', 'cost_alerts', 'meeting_analytics', 'meeting_cost_calculator', 'meeting_reports', 'team_management'],
  },
  {
    product: 'EquityLetter', born: '2026-03-22',
    genes: ['saas_onboarding', 'subscription_management', 'user_permissions'],
  },
  {
    product: 'VoiceInvoice', born: '2026-03-22',
    genes: ['accessibility_layer', 'invoice_numbering_system', 'invoice_template_system', 'pwa_offline_support', 'sms_delivery', 'team_mode', 'usage_quota_enforcement', 'voice_navigation'],
  },
];

// Products that were dropped before the public registry carried them.
const DROPPED_NAMES: Record<string, string> = {
  'zo-portalpulse': 'PortalPulse',
  'zo-certrelay': 'CertRelay',
};

function prettyName(origin: string, products: ProductRow[]): { name: string; status: string; url: string | null } {
  const slug = origin.replace(/^zo-/, '');
  const match = products.find((p) => p.name.toLowerCase().replace(/\s+/g, '') === slug);
  if (match) return { name: match.name, status: match.status, url: match.url };
  if (DROPPED_NAMES[origin]) return { name: DROPPED_NAMES[origin], status: 'dropped', url: null };
  return { name: slug, status: 'unknown', url: null };
}

function geneName(moduleId: string): string {
  // bcm-eligibility_date_engine-40ba8eee -> eligibility_date_engine
  return moduleId.replace(/^(qa-|mkt-|launch-)?bcm-/, '').replace(/-[0-9a-f]{6,8}$/, '');
}

export default async function GenomePage() {
  const supabase = createPublicClient();
  const [{ data: modules }, { data: products }] = await Promise.all([
    supabase.from('v_genome').select('module_id,name,description,module_type,project_origin,times_used,created_at'),
    supabase.from('v_products').select('name,status,url'),
  ]);

  const rows: GenomeRow[] = (modules ?? []) as GenomeRow[];
  const prods: ProductRow[] = (products ?? []) as ProductRow[];

  const total = rows.length;
  const pool = rows.filter((r) => !r.project_origin);
  const stamped = rows.filter((r) => r.project_origin);

  // Family tree for the stamped era: group genes by the product that created them.
  const byOrigin = new Map<string, GenomeRow[]>();
  for (const r of stamped) {
    const k = r.project_origin as string;
    byOrigin.set(k, [...(byOrigin.get(k) ?? []), r]);
  }
  const tree = Array.from(byOrigin.entries())
    .map(([origin, genes]) => ({
      ...prettyName(origin, prods),
      born: genes.reduce((a, g) => (g.created_at < a ? g.created_at : a), genes[0].created_at).slice(0, 10),
      genes: genes.filter((g) => (g.module_type ?? 'build') === 'build'),
      allCount: genes.length,
    }))
    .sort((a, b) => (a.born < b.born ? -1 : 1));

  // The genes inherited most often across all births.
  const mostInherited = [...rows]
    .filter((r) => (r.times_used ?? 0) > 0)
    .sort((a, b) => (b.times_used ?? 0) - (a.times_used ?? 0))
    .slice(0, 10);

  const totalInheritances = rows.reduce((a, r) => a + (r.times_used ?? 0), 0);

  return (
    <div className="v4">
      <JoinRevealObserver />

      <nav><div className="wrap nav">
        <Link href="/" className="logo">Zero<span>Origine</span></Link>
        <ul>
          <li><Link href="/#registry">Products</Link></li>
          <li><Link href="/logbook">Logbook</Link></li>
          <li><Link href="/join">Support</Link></li>
        </ul>
        <Link href="/join#claim" className="btn gold">Claim access</Link>
      </div></nav>

      <main>
        {/* Hero */}
        <section style={{ borderTop: 'none' }}><div className="wrap" style={{ textAlign: 'center' }}>
          <div className="eyebrow">The gene library</div>
          <h2 style={{ fontSize: 'clamp(34px,5.2vw,58px)', maxWidth: '20ch', margin: '0 auto' }}>
            Every product leaves <em style={{ fontStyle: 'normal', color: 'var(--alive)' }}>genes</em> behind.
          </h2>
          <p className="lede" style={{ margin: '18px auto 0', textAlign: 'center' }}>
            When the machine builds a product, the modules that survive QA are recorded in the genome.
            Every product born after inherits them. Nothing enters from outside: the supply chain is
            sealed, and the library only grows from proven births. The dead contribute too. The oldest
            gene in this genome came from a product that never shipped.
          </p>
        </div></section>

        {/* Live numbers */}
        <section className="reveal"><div className="wrap">
          <div className="eyebrow">Counted live from the machine&apos;s own records</div>
          <h2>The genome right now</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginTop: 34 }}>
            {[
              [String(total), 'genes in the library'],
              [String(byOrigin.size + RECORDED_ERA.length), 'products that contributed'],
              [String(totalInheritances), 'inheritances recorded'],
              [String(pool.length), 'genes in the founding pool'],
            ].map(([n, l]) => (
              <div key={l} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 22, background: 'var(--bg2)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 34, color: 'var(--alive)' }}>{n}</div>
                <div style={{ color: 'var(--dim)', marginTop: 6, fontSize: 14 }}>{l}</div>
              </div>
            ))}
          </div>
          <p className="lede" style={{ marginTop: 22, fontSize: 15 }}>
            These numbers are read from the gene registry at the moment you loaded this page.
            When the next product is born, they change on their own.
          </p>
        </div></section>

        {/* Family tree */}
        <section className="reveal"><div className="wrap">
          <div className="eyebrow">One-way inheritance</div>
          <h2>The family tree</h2>
          <p className="lede">
            Each entry names a product and the build genes it created. A gene created by one
            product serves every product born after it.
          </p>

          <div style={{ marginTop: 34, display: 'grid', gap: 14 }}>
            {RECORDED_ERA.map((p) => (
              <div key={p.product} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 22, background: 'var(--bg2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600 }}>{p.product}</h3>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim2)' }}>born {p.born} · founding era</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {p.genes.map((g) => (
                    <span key={g} style={{ fontFamily: 'var(--mono)', fontSize: 12.5, border: '1px solid var(--line2)', borderRadius: 6, padding: '4px 8px', color: 'var(--dim)' }}>{g}</span>
                  ))}
                </div>
              </div>
            ))}

            {tree.map((p) => (
              <div key={p.name} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 22, background: 'var(--bg2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600 }}>
                    {p.url ? <a href={p.url} style={{ color: 'inherit' }}>{p.name}</a> : p.name}
                  </h3>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: p.status === 'live' ? 'var(--alive)' : 'var(--dim2)' }}>
                    born {p.born} · {p.status}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {p.genes.length === 0
                    ? <span style={{ color: 'var(--dim)', fontSize: 14 }}>No new build genes. Built from inherited genes alone.</span>
                    : p.genes.map((g) => (
                        <span key={g.module_id} title={g.description ?? undefined} style={{ fontFamily: 'var(--mono)', fontSize: 12.5, border: '1px solid var(--line2)', borderRadius: 6, padding: '4px 8px', color: 'var(--dim)' }}>
                          {geneName(g.module_id)}
                        </span>
                      ))}
                </div>
              </div>
            ))}
          </div>
          <p className="lede" style={{ marginTop: 20, fontSize: 14.5 }}>
            The founding-era entries come from the genome ledger. Everything after is read live
            from the gene registry, so new births appear here without anyone editing this page.
          </p>
        </div></section>

        {/* Most inherited */}
        <section className="reveal"><div className="wrap">
          <div className="eyebrow">Selection pressure</div>
          <h2>The genes that keep getting inherited</h2>
          <p className="lede">
            Inheritance counts are how the genome shows its fitness. A gene used across many
            births has proven itself in many bodies.
          </p>
          <div style={{ marginTop: 30, display: 'grid', gap: 8, maxWidth: 720 }}>
            {mostInherited.map((m) => (
              <div key={m.module_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderLeft: '2px solid var(--alive)', paddingLeft: 14, alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13.5, color: 'var(--txt)' }}>{geneName(m.module_id)}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--dim2)', whiteSpace: 'nowrap' }}>{m.times_used} inheritances</span>
              </div>
            ))}
          </div>
        </div></section>

        {/* CTA */}
        <section className="cta"><div className="wrap">
          <div className="eyebrow">Read the genes themselves</div>
          <h2>The tree is public. The genes go to <em style={{ fontStyle: 'normal', color: 'var(--alive)' }}>supporters</em>.</h2>
          <p className="lede" style={{ marginInline: 'auto', textAlign: 'center' }}>
            Supporters get read access to the private gene library: the promoted, import-ready
            genes with their docs, plus the full recorded tree. The machine harvests more genes
            from every birth, and access is for life.
          </p>
          <div className="heroCta" style={{ justifyContent: 'center', marginTop: 24 }}>
            <Link href="/join" className="btn gold">Fund a birth</Link>
            <Link href="/join#claim" className="btn ghost">Already supported? Claim access</Link>
          </div>
        </div></section>
      </main>

      <footer><div className="wrap fr">
        <span>© 2026 ZeroOrigine · run by the things it describes · <Link href="/privacy">privacy</Link> · <Link href="/terms">terms</Link></span>
        <span><Link href="/">← back to main site</Link></span>
      </div></footer>
    </div>
  );
}
