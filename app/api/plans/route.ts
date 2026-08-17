// CANONICAL: public plans catalog API, read from the seeded lienclock_plans table so prices live in the database.
import {
  databaseError,
  jsonOk,
  unexpectedError,
} from '@/lib/api/http';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PLAN_COLUMNS } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('lienclock_plans')
      .select(PLAN_COLUMNS)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) return databaseError('We could not load plans right now. Try again in a moment.', error);
    return jsonOk({ plans: data ?? [] }, 200, {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    });
  } catch (error) {
    return unexpectedError(error);
  }
}
