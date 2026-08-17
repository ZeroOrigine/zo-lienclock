import Link from 'next/link';
import SubNav from '@/components/SubNav';
import type { Metadata } from 'next';
import { createPublicClient } from '@/lib/supabase/public';
import { getTreasury } from '@/lib/zo';

/**
 * THE FULL LEDGER.
 *
 * The homepage headline says "Our books are public. Every line." and the
 * homepage showed SEVEN rows, with no way anywhere on the site to see the rest.
 * A claim of completeness with no way to check it is the same shape as a tick
 * mark nobody computed. This is the page that makes the headline true.
 *
 * ROW CAPS ARE THE ENEMY HERE. v_cost_logs already holds 1,086 rows, past
 * PostgREST's 1,000-row default, so any client-side sum over "all rows" would
 * silently undercount and print a confidently wrong total. Totals therefore
 * come from the aggregate views (getTreasury), and this page only ever
 * PAGINATES rows for display. It never adds them up.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'The Treasury. Every line of it | ZeroOrigine',
  description:
    'The complete public ledger: every unit of machine thought bought, every donation received, with a timestamp, a Mind and a product.',
};

const PAGE_SIZE = 100;

type Row = {
  created_at: string;
  workflow: string | null;
  project_id: string | null;
  cost_usd: number;
  kind: 'in' | 'out';
  who?: string | null;
};

export default async function TreasuryPage({
  searchParams,
}: {
  searchParams: { page?: string; product?: string };
}) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const product = (searchParams.product || '').trim();
  const supabase = createPublicClient();

  let q = supabase
    .from('v_cost_logs')
    .select('created_at,workflow,project_id,cost_usd')
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (product) q = q.eq('project_id', product);

  // THE COUNT MUST NOT DEPEND ON THE PAGE. Asking for the count on the same
  // ranged query returns null once the range is past the end, and the page
  // then printed "page 99 of 1" — a page reporting the ledger as eleven times
  // smaller than it is, on the one page whose whole job is to state its size
  // correctly. The count is now its own head-only query with no range on it,
  // so overshooting the last page shows no rows and STILL prints the real
  // total, which is the honest answer to "how much is there".
  let cq = supabase.from('v_cost_logs').select('created_at', { count: 'exact', head: true });
  if (product) cq = cq.eq('project_id', product);

  const [{ data: costs }, { count }, { data: dons }, treasury] = await Promise.all([
    q,
    cq,
    supabase
      .from('v_donations_public')
      .select('created_at,amount,donor_name,allocated_project_id')
      .order('created_at', { ascending: false })
      .limit(200),
    getTreasury(),
  ]);

  const outs: Row[] = (costs ?? []).map((r) => ({
    created_at: r.created_at as string,
    workflow: r.workflow as string | null,
    project_id: r.project_id as string | null,
    cost_usd: Number(r.cost_usd) || 0,
    kind: 'out',
  }));
  // Donations interleave only on page 1 and only when unfiltered, so a reader
  // paging through spend is never shown the same donation on every page.
  const ins: Row[] =
    page === 1 && !product
      ? (dons ?? []).map((r) => ({
          created_at: r.created_at as string,
          workflow: 'donation',
          project_id: r.allocated_project_id as string | null,
          cost_usd: Number(r.amount) || 0,
          kind: 'in',
          who: (r.donor_name as string | null) ?? 'anonymous',
        }))
      : [];
  const rows = [...outs, ...ins].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // UNKNOWN IS NOT ZERO. If the count cannot be read, the page says so rather
  // than printing "of 1" and implying the ledger is one page long.
  const totalRows = typeof count === 'number' ? count : null;
  const lastPage = totalRows !== null ? Math.max(1, Math.ceil(totalRows / PAGE_SIZE)) : null;
  const pastEnd = lastPage !== null && page > lastPage;
  const qs = (p: number) =>
    `/treasury?page=${p}${product ? `&product=${encodeURIComponent(product)}` : ''}`;

  return (
    <div className="v4" style={{ minHeight: '100vh' }}>
      <SubNav />
      <main className="wrap" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <div className="eyebrow">The treasury</div>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 34, margin: '12px 0 10px' }}>
          Every line of it.
        </h1>
        <p className="lede" style={{ maxWidth: 700 }}>
          Every cost here is one unit of machine thought, with a timestamp, a Mind and a product.
          Every donation is here too, and whether it has been allocated into a birth yet.
          These costs are the machine&apos;s own estimate from token counts, not vendor invoices.
          The invoiced ledger is being built and the two are deliberately not added together.
          {totalRows !== null && totalRows > 0 ? (
            <> {totalRows.toLocaleString()} cost {totalRows === 1 ? 'line' : 'lines'} recorded
              {product ? <> for <b>{product.replace(/^zo-/, '')}</b></> : null}.</>
          ) : null}
        </p>

        {treasury ? (
          <div className="tie" style={{ margin: '24px 0' }}>
            <span>
              all-time · estimated cost of machine thought <b>${treasury.apiSpend.toFixed(2)}</b>
              {' '}· declared infrastructure <b>${treasury.fixed.toFixed(2)}</b>
              {treasury.donationsTotal > 0 ? (
                <> · supporters <b>${treasury.donationsTotal.toFixed(2)}</b> (allocated $
                  {treasury.donationsAllocated.toFixed(2)} + not yet allocated $
                  {treasury.donationsUnallocated.toFixed(2)})</>
              ) : null}
            </span>
          </div>
        ) : (
          // FAIL LOUD, NOT SILENT. A ledger page that cannot read its own
          // totals says so, rather than rendering an empty summary that looks
          // like a zero balance.
          <div className="tie" style={{ margin: '24px 0' }}>
            <span style={{ color: 'var(--gold)' }}>
              ⚠ the totals could not be read just now. The lines below are still accurate; the
              summary is not being shown rather than being guessed.
            </span>
          </div>
        )}

        {product ? (
          <p style={{ margin: '0 0 16px' }}>
            <Link href="/treasury" style={{ color: 'var(--alive)' }}>← every product</Link>
          </p>
        ) : null}

        <div className="ledger">
          <div className="lhead">
            <span>When</span><span>What</span><span>Who / where</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
          </div>
          {rows.length === 0 ? (
            <div className="lrow">
              <span style={{ color: 'var(--dim)' }}>
                {pastEnd
                  ? <>Nothing here. The ledger ends at page {lastPage}.{' '}
                      <Link href={qs(lastPage!)} style={{ color: 'var(--alive)' }}>Go to the last page →</Link></>
                  : 'No lines on this page.'}
              </span>
            </div>
          ) : rows.map((r, i) => (
            <div key={i} className="lrow">
              <span>{new Date(r.created_at).toLocaleDateString('en-CA', {
                year: 'numeric', month: 'short', day: 'numeric' })}</span>
              <span className={r.kind === 'in' ? 'in' : 'out'}>
                {r.kind === 'in' ? '↓ donation' : `↑ ${r.workflow ?? 'pipeline'}`}
              </span>
              <span className="who">
                {r.kind === 'in'
                  ? (r.who ?? 'anonymous')
                  : r.project_id
                    ? <Link href={qs(1).replace(/page=1.*/, `page=1&product=${encodeURIComponent(r.project_id)}`)}
                            style={{ color: 'inherit' }}>{r.project_id.replace(/^zo-/, '')}</Link>
                    : 'ecosystem'}
              </span>
              <span style={{ textAlign: 'right' }} className={r.kind === 'in' ? 'in' : 'out'}>
                {r.kind === 'in' ? `+$${r.cost_usd.toFixed(2)}` : `−$${r.cost_usd.toFixed(4)}`}
              </span>
            </div>
          ))}
        </div>

        {/* NO SILENT CAPS. The page count is printed, so a reader can see there
            is more and reach it, rather than being shown 100 rows that look
            like the whole ledger. */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 22, fontSize: 14 }}>
          {page > 1 ? <Link href={qs(page - 1)} style={{ color: 'var(--alive)' }}>← newer</Link> : <span style={{ color: 'var(--dim2)' }}>← newer</span>}
          <span style={{ color: lastPage === null ? 'var(--gold)' : 'var(--dim)', fontFamily: 'var(--mono)' }}>
            {lastPage !== null ? <>page {page} of {lastPage}</> : <>page {page} · ⚠ total could not be read</>}
          </span>
          {lastPage === null
            ? (rows.length === PAGE_SIZE ? <Link href={qs(page + 1)} style={{ color: 'var(--alive)' }}>older →</Link> : <span style={{ color: 'var(--dim2)' }}>older →</span>)
            : (page < lastPage ? <Link href={qs(page + 1)} style={{ color: 'var(--alive)' }}>older →</Link> : <span style={{ color: 'var(--dim2)' }}>older →</span>)}
        </div>

        <p style={{ color: 'var(--dim)', fontSize: 13, marginTop: 28, maxWidth: 700 }}>
          Costs are shown to four decimal places because that is how they are recorded. Totals come
          from the database&apos;s own aggregates, never from adding up the rows on screen, so the
          figure above cannot drift as the ledger grows past a page.
        </p>
      </main>
    </div>
  );
}
