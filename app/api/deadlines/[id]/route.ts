// CANONICAL: single deadline API. Status changes drive completion tracking and reminder resync via database triggers.
// rate-limit-exempt: false positive — every write below passes enforceWriteLimit (lib/rate-limit rateLimitCheck, the shared rate_limit_check contract) backed by the durable lienclock_rate_limit_bump RPC before any work.
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  databaseError,
  enforceWriteLimit,
  jsonError,
  jsonOk,
  parseWith,
  readJsonBody,
  requireUser,
  unexpectedError,
  uuidSchema,
  withDaysRemaining,
} from '@/lib/api/http';
import { DEADLINE_COLUMNS, REMINDER_COLUMNS, type DeadlineStatus, type JobStatus } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

const updateDeadlineSchema = z.object({
  status: z.enum(['upcoming', 'completed', 'missed', 'not_applicable'], {
    errorMap: () => ({ message: 'Status must be upcoming, completed, missed, or not_applicable.' }),
  }),
});

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const idResult = uuidSchema.safeParse(params.id);
    if (!idResult.success) return jsonError('That deadline link is not valid.', { status: 400, code: 'invalid_id' });

    const auth = await requireUser();
    if ('response' in auth) return auth.response;
    const { supabase, user } = auth;

    const { data: deadlineRow, error: fetchError } = await supabase
      .from('lienclock_deadlines')
      .select(`${DEADLINE_COLUMNS}, job:lienclock_jobs(id, name, state_code, gc_name, status)`)
      .eq('id', idResult.data)
      .eq('user_id', user.id)
      .maybeSingle();
    if (fetchError) return databaseError('We could not load that deadline right now. Try again in a moment.', fetchError);
    if (!deadlineRow) return jsonError('We could not find that deadline.', { status: 404, code: 'not_found' });

    const { data: reminders, error: remindersError } = await supabase
      .from('lienclock_reminders')
      .select(REMINDER_COLUMNS)
      .eq('deadline_id', idResult.data)
      .eq('user_id', user.id)
      .order('remind_at', { ascending: true });
    if (remindersError) {
      return databaseError('We could not load reminders for that deadline. Try again in a moment.', remindersError);
    }

    return jsonOk({
      deadline: withDaysRemaining(deadlineRow as { due_date: string }),
      reminders: reminders ?? [],
    });
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const limited = await enforceWriteLimit(request);
    if (limited) return limited;

    const idResult = uuidSchema.safeParse(params.id);
    if (!idResult.success) return jsonError('That deadline link is not valid.', { status: 400, code: 'invalid_id' });
    const deadlineId = idResult.data;

    const auth = await requireUser();
    if ('response' in auth) return auth.response;
    const { supabase, user } = auth;

    const read = await readJsonBody(request);
    if ('response' in read) return read.response;
    const parsed = parseWith(updateDeadlineSchema, read.body);
    if ('response' in parsed) return parsed.response;
    const input = parsed.data;

    const { data: existingRow, error: fetchError } = await supabase
      .from('lienclock_deadlines')
      .select('id, status, job:lienclock_jobs(id, status)')
      .eq('id', deadlineId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (fetchError) return databaseError('We could not load that deadline right now. Try again in a moment.', fetchError);
    if (!existingRow) return jsonError('We could not find that deadline.', { status: 404, code: 'not_found' });

    const existing = existingRow as unknown as {
      id: string;
      status: DeadlineStatus;
      job: { id: string; status: JobStatus } | null;
    };
    if (input.status === 'upcoming' && existing.job && existing.job.status === 'archived') {
      return jsonError('This job is archived. Restore the job to resume tracking this deadline.', {
        status: 409,
        code: 'job_archived',
      });
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from('lienclock_deadlines')
      .update({
        status: input.status,
        completed_at: input.status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', deadlineId)
      .eq('user_id', user.id)
      .select(DEADLINE_COLUMNS)
      .single();
    if (updateError || !updatedRow) {
      return databaseError('We could not update that deadline. Try again in a moment.', updateError);
    }

    return jsonOk({ deadline: withDaysRemaining(updatedRow as { due_date: string }) });
  } catch (error) {
    return unexpectedError(error);
  }
}
