// CANONICAL: single job API. Soft delete only: archiving preserves deadline history for compliance records.
// rate-limit-exempt: false positive — every write below passes enforceWriteLimit (lib/rate-limit rateLimitCheck, the shared rate_limit_check contract) backed by the durable lienclock_rate_limit_bump RPC before any work.
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  databaseError,
  dateStringSchema,
  definedFields,
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
import { getCoveredStates } from '@/lib/db/state-rules';
import { countJobs, getPlanContext } from '@/lib/db/subscription';
import { DEADLINE_COLUMNS, JOB_COLUMNS, type Job } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

const updateJobSchema = z
  .object({
    name: z.string().trim().min(1, 'Give this job a name.').max(200, 'Keep the job name under 200 characters.').optional(),
    state_code: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, 'Use the two letter state code, like TX.')
      .transform((value) => value.toUpperCase())
      .optional(),
    gc_name: z
      .string()
      .trim()
      .min(1, 'Enter the general contractor name.')
      .max(200, 'Keep the general contractor name under 200 characters.')
      .optional(),
    owner_name: z.string().trim().max(200, 'Keep the owner name under 200 characters.').optional().nullable(),
    property_address: z
      .string()
      .trim()
      .max(500, 'Keep the property address under 500 characters.')
      .optional()
      .nullable(),
    start_date: dateStringSchema('start date').optional(),
    completion_date: dateStringSchema('completion date').optional().nullable(),
    lien_filed_date: dateStringSchema('lien filed date').optional().nullable(),
    contract_amount: z
      .number({ invalid_type_error: 'Enter the contract amount as a number.' })
      .min(0, 'The contract amount cannot be negative.')
      .max(999999999.99, 'The contract amount is larger than we can store.')
      .optional()
      .nullable(),
    notes: z.string().trim().max(2000, 'Keep notes under 2000 characters.').optional().nullable(),
    status: z
      .enum(['active', 'completed', 'archived'], {
        errorMap: () => ({ message: 'Status must be active, completed, or archived.' }),
      })
      .optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Send at least one field to update.',
  });

async function loadJob(supabase: AwaitedAuth['supabase'], userId: string, jobId: string) {
  return supabase
    .from('lienclock_jobs')
    .select(JOB_COLUMNS)
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle();
}

type AwaitedAuth = Exclude<Awaited<ReturnType<typeof requireUser>>, { response: unknown }>;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const idResult = uuidSchema.safeParse(params.id);
    if (!idResult.success) return jsonError('That job link is not valid.', { status: 400, code: 'invalid_id' });

    const auth = await requireUser();
    if ('response' in auth) return auth.response;
    const { supabase, user } = auth;

    const { data: jobRow, error: fetchError } = await loadJob(supabase, user.id, idResult.data);
    if (fetchError) return databaseError('We could not load that job right now. Try again in a moment.', fetchError);
    if (!jobRow) return jsonError('We could not find that job.', { status: 404, code: 'not_found' });

    const { data: deadlines, error: deadlinesError } = await supabase
      .from('lienclock_deadlines')
      .select(DEADLINE_COLUMNS)
      .eq('job_id', idResult.data)
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });
    if (deadlinesError) {
      return databaseError('We could not load deadlines for that job. Try again in a moment.', deadlinesError);
    }

    return jsonOk({ job: jobRow as Job, deadlines: (deadlines ?? []).map(withDaysRemaining) });
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const limited = await enforceWriteLimit(request);
    if (limited) return limited;

    const idResult = uuidSchema.safeParse(params.id);
    if (!idResult.success) return jsonError('That job link is not valid.', { status: 400, code: 'invalid_id' });
    const jobId = idResult.data;

    const auth = await requireUser();
    if ('response' in auth) return auth.response;
    const { supabase, user } = auth;

    const read = await readJsonBody(request);
    if ('response' in read) return read.response;
    const parsed = parseWith(updateJobSchema, read.body);
    if ('response' in parsed) return parsed.response;
    const input = parsed.data;

    const { data: existingRow, error: fetchError } = await loadJob(supabase, user.id, jobId);
    if (fetchError) return databaseError('We could not load that job right now. Try again in a moment.', fetchError);
    if (!existingRow) return jsonError('We could not find that job.', { status: 404, code: 'not_found' });
    const existing = existingRow as Job;

    const effectiveStart = input.start_date ?? existing.start_date;
    const effectiveCompletion = input.completion_date === undefined ? existing.completion_date : input.completion_date;
    const effectiveLienFiled = input.lien_filed_date === undefined ? existing.lien_filed_date : input.lien_filed_date;
    if (effectiveCompletion && effectiveCompletion < effectiveStart) {
      return jsonError('The completion date cannot come before the start date.', {
        status: 400,
        code: 'validation_failed',
        details: { completion_date: ['The completion date cannot come before the start date.'] },
      });
    }
    if (effectiveLienFiled && effectiveLienFiled < effectiveStart) {
      return jsonError('The lien filed date cannot come before the job start date.', {
        status: 400,
        code: 'validation_failed',
        details: { lien_filed_date: ['The lien filed date cannot come before the job start date.'] },
      });
    }

    if (input.state_code && input.state_code !== existing.state_code) {
      const coveredStates = await getCoveredStates(supabase);
      if (!coveredStates.includes(input.state_code)) {
        return jsonError(
          `LienClock does not cover ${input.state_code} yet. Covered states: ${coveredStates.join(', ')}.`,
          { status: 422, code: 'state_not_covered', details: { covered_states: coveredStates } }
        );
      }
    }

    if (input.status === 'active' && existing.status !== 'active') {
      const planContext = await getPlanContext(supabase, user.id);
      const activeJobs = await countJobs(supabase, user.id, 'active');
      if (planContext.max_active_jobs !== null && activeJobs >= planContext.max_active_jobs) {
        const jobWord = planContext.max_active_jobs === 1 ? 'active job' : 'active jobs';
        return jsonError(
          `Your ${planContext.plan_name} plan tracks ${planContext.max_active_jobs} ${jobWord}. Upgrade to Pro for unlimited jobs, or archive another job first.`,
          { status: 403, code: 'plan_limit_reached' }
        );
      }
    }

    const updates = definedFields({
      name: input.name,
      state_code: input.state_code,
      gc_name: input.gc_name,
      owner_name: input.owner_name,
      property_address: input.property_address,
      start_date: input.start_date,
      completion_date: input.completion_date,
      lien_filed_date: input.lien_filed_date,
      contract_amount: input.contract_amount,
      notes: input.notes,
      status: input.status,
    });

    const { data: updatedRow, error: updateError } = await supabase
      .from('lienclock_jobs')
      .update(updates)
      .eq('id', jobId)
      .eq('user_id', user.id)
      .select(JOB_COLUMNS)
      .single();
    if (updateError || !updatedRow) {
      return databaseError('We could not save those changes. Try again in a moment.', updateError);
    }
    const updated = updatedRow as Job;

    if (existing.status !== 'archived' && updated.status === 'archived') {
      const { error: archiveSyncError } = await supabase
        .from('lienclock_deadlines')
        .update({ status: 'not_applicable' })
        .eq('job_id', jobId)
        .eq('user_id', user.id)
        .eq('status', 'upcoming');
      if (archiveSyncError) {
        return databaseError('The job was archived but its deadlines did not update. Refresh and try again.', archiveSyncError);
      }
    }

    if (existing.status === 'archived' && updated.status !== 'archived') {
      // QA-038/QA-041: archiving flipped every 'upcoming' deadline to
      // 'not_applicable', and unarchiving used to take 4 sequential DB
      // round-trips to undo it. The lienclock_unarchive_job RPC (owner-guarded,
      // SECURITY DEFINER) now does revive + recalc + reload in ONE round-trip:
      // it flips archive-dismissed 'not_applicable' rows back to 'upcoming'
      // (never a deadline_type already completed/missed; QA-034), re-applies
      // current rules via lienclock_recalculate_job_deadlines, and returns the
      // final deadline set ordered by due_date.
      const { data: restoredDeadlines, error: unarchiveError } = await supabase.rpc('lienclock_unarchive_job', {
        p_job_id: jobId,
      });
      if (unarchiveError) {
        return databaseError('The job was restored but deadlines did not recalculate. Edit the job dates to retry.', unarchiveError);
      }
      return jsonOk({ job: updated, deadlines: (restoredDeadlines ?? []).map(withDaysRemaining) });
    }

    const { data: deadlines, error: deadlinesError } = await supabase
      .from('lienclock_deadlines')
      .select(DEADLINE_COLUMNS)
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });
    if (deadlinesError) {
      return databaseError('The job saved but we could not load its deadlines. Refresh to see them.', deadlinesError);
    }

    return jsonOk({ job: updated, deadlines: (deadlines ?? []).map(withDaysRemaining) });
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const limited = await enforceWriteLimit(request);
    if (limited) return limited;

    const idResult = uuidSchema.safeParse(params.id);
    if (!idResult.success) return jsonError('That job link is not valid.', { status: 400, code: 'invalid_id' });
    const jobId = idResult.data;

    const auth = await requireUser();
    if ('response' in auth) return auth.response;
    const { supabase, user } = auth;

    const { data: existingRow, error: fetchError } = await loadJob(supabase, user.id, jobId);
    if (fetchError) return databaseError('We could not load that job right now. Try again in a moment.', fetchError);
    if (!existingRow) return jsonError('We could not find that job.', { status: 404, code: 'not_found' });
    if ((existingRow as Job).status === 'archived') return jsonOk({ job: existingRow as Job });

    const { data: archivedRow, error: archiveError } = await supabase
      .from('lienclock_jobs')
      .update({ status: 'archived' })
      .eq('id', jobId)
      .eq('user_id', user.id)
      .select(JOB_COLUMNS)
      .single();
    if (archiveError || !archivedRow) {
      return databaseError('We could not archive that job. Try again in a moment.', archiveError);
    }

    const { error: deadlineSyncError } = await supabase
      .from('lienclock_deadlines')
      .update({ status: 'not_applicable' })
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .eq('status', 'upcoming');
    if (deadlineSyncError) {
      return databaseError('The job was archived but its deadlines did not update. Refresh and try again.', deadlineSyncError);
    }

    return jsonOk({ job: archivedRow as Job });
  } catch (error) {
    return unexpectedError(error);
  }
}
