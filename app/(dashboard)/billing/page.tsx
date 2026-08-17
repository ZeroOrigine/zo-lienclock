// CANONICAL: billing route; reads checkout return params server-side and renders the client billing manager.
import BillingClient from '@/components/billing-client';

export const dynamic = 'force-dynamic';

export default function BillingPage({ searchParams }: { searchParams?: { checkout?: string; billing?: string } }) {
  const checkout = searchParams?.checkout ?? searchParams?.billing;
  const notice = checkout === 'success' ? 'success' : checkout === 'cancel' || checkout === 'canceled' ? 'cancel' : null;
  return <BillingClient notice={notice} />;
}
