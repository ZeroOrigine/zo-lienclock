// CANONICAL: reminders list API so users can see exactly which nudges are scheduled and what already went out.
import type { NextRequest } from 'next/server';
import {
  databaseError,
  jsonError,
  jsonOk,
  paginationMeta,
  parsePagination,
  requireUser,
  unexpectedError,
} from '@/lib/api/http';
import { REMINDER_COLUMNS } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS = new Set(['pending', 'sent', 'failed', 'canceled', 'all']);
const CHANNEL_FILTERS = new Set(['email', 'sms']);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();
    if ('response' in auth) return auth.response;
    const { supabase, user } = auth;

    const searchParams = request.nextUrl.searchParams;
    const pagination = parsePagination(searchParams);

    const statusFilter = searchParams.get('status') ?? 'pending';
    if (!STATUS_FILTERS.has(statusFilter)) {
      return jsonError('Filter status by pending, sent, failed, canceled, or all.', {
        status: 400,
        code: 'invalid_filter',
      });
    }
    const channelFilter = searchParams.get('channel');
    if (channelFilter !== null && !CHANNEL_FILTERS.has(channelFilter)) {
      return jsonError('Filter channel by email or sms.', { status: 400, code: 'invalid_filter' });
    }

    let query = supabase
      .from('lienclock_reminders')
      .select(
        `${REMINDER_COLUMNS}, deadline:lienclock_deadlines(id, deadline_type, due_date, status, job:lienclock_jobs(id, name, state_code))`,
        { count: 'exact' }
      )
      .eq('user_id', user.id);
    if (statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (channelFilter) query = query.eq('channel', channelFilter);

    const { data, count, error } = await query
      .order('remind_at', { ascending: true })
      .range(pagination.from, pagination.to);
    if (error) return databaseError('We could not load your reminders right now. Try again in a moment.', error);

    const reminders = data ?? [];
    const total = count ?? 0;

    return jsonOk({
      reminders,
      pagination: paginationMeta(pagination, total, reminders.length),
    });
  } catch (error) {
    return unexpectedError(error);
  }
}
