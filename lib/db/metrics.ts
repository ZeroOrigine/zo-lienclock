// CANONICAL: server-side purpose beacon writes to zo_product_metrics (Law 116, always fail-soft).
import { createServiceRoleClient } from '@/lib/supabase/server';

type ServerMetricEvent = 'signup' | 'activation' | 'payment';

export async function trackServerEvent(event: ServerMetricEvent, path: string): Promise<void> {
  try {
    const client = createServiceRoleClient();
    const { error } = await client
      .from('zo_product_metrics')
      .insert({ product_slug: 'lienclock', event, path });
    if (error) console.error('[lienclock] metrics insert failed:', error.message);
  } catch (error) {
    console.error('[lienclock] metrics emit failed:', error);
  }
}
