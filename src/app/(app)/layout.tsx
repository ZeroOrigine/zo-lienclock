import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FeedbackWidget from '@/components/FeedbackWidget';
import ZoBeacon from '@/components/ZoBeacon';
import { notFound } from 'next/navigation';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // THE TEMPLATE ISLAND. These pages (pricing, auth, dashboard, maintenance)
  // belong to a PRODUCT, not to ZeroOrigine. On the public site they were live
  // and cross-linked by their own footer, advertising a "$29/month Pro" plan
  // that does not exist, from a company whose entire premise is never inflating
  // a number. Route handlers under (app)/api are unaffected: a layout does not
  // gate them, so Stripe, health and feedback keep working everywhere.
  if (process.env.ZO_PUBLIC_SITE === 'true') notFound();
  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#fff', color: '#111827' }}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FeedbackWidget />
      {/* THE SENSE ORGAN, law #116. It existed in this template and was
          imported by NOTHING, which is exactly why zo_product_metrics held zero
          rows and /purpose read every product `unmeasured`. A sense organ wired
          into nothing is not an instrument, it is a decoration. Rendered here so
          every product born from this template can prove it served a human,
          with no edit to purpose.py and no human touching a dict. */}
      <ZoBeacon />
    </div>
  );
}
