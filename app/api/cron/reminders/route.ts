// CANONICAL: scheduled maintenance for deadline and reminder status hygiene.
// Delivery of due reminders is owned by the platform dispatcher that polls lienclock_reminders.
// rate-limit-exempt: guarded by the CRON_SECRET bearer token, not a public write surface.
import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import {
  addDaysUtc,
  jsonError,
  jsonOk,
  todayUtc,
  unexpectedError,
} from '@/lib/api/http';
import { createServiceRoleClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!presented) return false;
  // sha256 both sides to fixed-length digests so timingSafeEqual never throws
  // on length mismatch and the comparison is constant-time.
  const presentedDigest = createHash('sha256').update(presented).digest();
  const secretDigest = createHash('sha256').update(secret).digest();
  return timingSafeEqual(presentedDigest, secretDigest);
}

async function runMaintenance() {
  const admin = createServiceRoleClient();

  // A deadline flips to missed only once its date is clearly past in every US timezone.
  const missedCutoff = addDaysUtc(todayUtc(), -2);
  const { data: missed, error: missedError } = await admin
    .from('lienclock_deadlines')
    .update({ status: 'missed' })
    .eq('status', 'upcoming')
    .lte('due_date', missedCutoff)
    .select('id');
  if (missedError) throw missedError;

  const staleCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: expired, error: expiredError } = await admin
    .from('lienclock_reminders')
    .update({ status: 'canceled', error_message: 'Expired before the delivery window.' })
    .eq('status', 'pending')
    .lt('remind_at', staleCutoff)
    .select('id');
  if (expiredError) throw expiredError;

  return {
    deadlines_marked_missed: (missed ?? []).length,
    stale_reminders_canceled: (expired ?? []).length,
    ran_at: new Date().toISOString(),
  };
}

async function handle(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return jsonError('This endpoint is for the scheduler only.', { status: 401, code: 'unauthorized' });
    }
    const result = await runMaintenance();
    return jsonOk(result);
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
