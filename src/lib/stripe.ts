import Stripe from 'stripe';
import { SERVER_CONFIG } from '@/lib/config';

// Central-payments products get NO Stripe secret (rec #186): a placeholder
// keeps this module importable; any legacy call with it fails loudly at the
// call site, never silently.
export const stripe = new Stripe(
  SERVER_CONFIG.stripeSecretKey || 'sk_absent_central_payments_mode',
  {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
});
