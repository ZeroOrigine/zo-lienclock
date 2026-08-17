// CANONICAL: deadlines feed API. Powers the what-is-next view across all jobs, soonest first.
import type { NextRequest } from 'next/server';
import {
  addDaysUtc,
  databaseError,
  jsonError,
  jsonOk,
  paginationMeta,
  parsePagination,
  requireUser,
  todayUtc,
  unexpectedError,
  uuidSchema,
  withDaysRemaining,
} from '@/lib/api/http';
import { DEADLINE_COLUMNS } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS = new Set(['upcoming', 'completed', 'missed', 'not_applicable', 'all']);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();
    if ('response' in auth) return auth.response;
    const { supabase, user } = auth;

    const searchParams = request.nextUrl.searchParams;
    const pagination = parsePagination(searchParams);

    const statusFilter = searchParams.get('status') ?? 'upcoming';
    if (!STATUS_FILTERS.has(statusFilter)) {
      return jsonError('Filter status by upcoming, completed, missed, not_applicable, or all.', {
        status: 400,
        code: 'invalid_filter',
      });
    }

    const jobIdParam = searchParams.get('job_id');
    if (jobIdParam !== null && !uuidSchema.safeParse(jobIdParam).success) {
      return jsonError('That job filter is not valid.', { status: 400, code: 'invalid_filter' });
    }

    const withinRaw = searchParams.get('within_days');
    let withinDays: number | null = null;
    if (withinRaw !== null) {
      const parsedWithin = Number.parseInt(withinRaw, 10);
      if (!Number.isFinite(parsedWithin) || parsedWithin < 1 || parsedWithin > 730) {
        return jsonError('within_days must be a whole number between 1 and 730.', {
          status: 400,
          code: 'invalid_filter',
        });
      }
      withinDays = parsedWithin;
    }

    let query = supabase
      .from('lienclock_deadlines')
      .select(`${DEADLINE_COLUMNS}, job:lienclock_jobs(id, name, state_code, gc_name, status)`, { count: 'exact' })
      .eq('user_id', user.id);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (jobIdParam) query = query.eq('job_id', jobIdParam);
    if (withinDays !== null) query = query.lte('due_date', addDaysUtc(todayUtc(), withinDays));

    const { data, count, error } = await query
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true })
      .range(pagination.from, pagination.to);
    if (error) return databaseError('We could not load your deadlines right now. Try again in a moment.', error);

    const rows = (data ?? []) as Array<{ due_date: string }>;
    const total = count ?? 0;

    return jsonOk({
      deadlines: rows.map(withDaysRemaining),
      pagination: paginationMeta(pagination, total, rows.length),
    });
  } catch (error) {
    return unexpectedError(error);
  }
}
