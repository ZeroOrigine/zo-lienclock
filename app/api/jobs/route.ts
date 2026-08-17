// CANONICAL: jobs collection API. List includes plan usage; create enforces coverage and plan limits and returns calculated deadlines.
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  databaseError,
  dateStringSchema,
  enforceWriteLimit,
  jsonError,
  jsonOk,
  paginationMeta,
  parsePagination,
  parseWith,
  readJsonBody,
  requireUser,
  unexpectedError,
  withDaysRemaining,
} from '@/lib/api/http';
import { getCoveredStates } from '@/lib/db/state-rules';
import { countJobs, getPlanContext } from '@/lib/db/subscription';
import { trackServerEvent } from '@/lib/db/metrics';
import { DEADLINE_COLUMNS, JOB_COLUMNS, type Job } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

const STATUS_FILTERS = new Set(['current', 'active', 'completed', 'archived', 'all']);

const createJobSchema = z
  .object({
    name: z
      .string({ required_error: 'Give this job a name.' })
      .trim()
      .min(1, 'Give this job a name.')
      .max(200, 'Keep the job name under 200 characters.'),
    state_code: z
      .string({ required_error: 'Pick the state where the job is located.' })
      .trim()
      .regex(/^[A-Za-z]{2}$/, 'Use the two letter state code, like TX.')
      .transform((value) => value.toUpperCase()),
    gc_name: z
      .string({ required_error: 'Enter the general contractor name.' })
      .trim()
      .min(1, 'Enter the general contractor name.')
      .max(200, 'Keep the general contractor name under 200 characters.'),
    owner_name: z.string().trim().max(200, 'Keep the owner name under 200 characters.').optional().nullable(),
    property_address: z
      .string()
      .trim()
      .max(500, 'Keep the property address under 500 characters.')
      .optional()
      .nullable(),
    start_date: dateStringSchema('start date'),
    completion_date: dateStringSchema('completion date').optional().nullable(),
    lien_filed_date: dateStringSchema('lien filed date').optional().nullable(),
    contract_amount: z
      .number({ invalid_type_error: 'Enter the contract amount as a number.' })
      .min(0, 'The contract amount cannot be negative.')
      .max(999999999.99, 'The contract amount is larger than we can store.')
      .optional()
      .nullable(),
    notes: z.string().trim().max(2000, 'Keep notes under 2000 characters.').optional().nullable(),
  })
  .superRefine((value, context) => {
    if (value.completion_date && value.completion_date < value.start_date) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['completion_date'],
        message: 'The completion date cannot come before the start date.',
      });
    }
    if (value.lien_filed_date && value.lien_filed_date < value.start_date) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lien_filed_date'],
        message: 'The lien filed date cannot come before the job start date.',
      });
    }
  });

interface UpcomingDeadlineSummary {
  id: string;
  job_id: string;
  deadline_type: string;
  due_date: string;
  is_estimated: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();
    if ('response' in auth) return auth.response;
    const { supabase, user } = auth;

    const searchParams = request.nextUrl.searchParams;
    const pagination = parsePagination(searchParams);
    const statusFilter = searchParams.get('status') ?? 'current';
    if (!STATUS_FILTERS.has(statusFilter)) {
      return jsonError('Filter status by active, completed, archived, or all.', {
        status: 400,
        code: 'invalid_filter',
      });
    }

    let query = supabase
      .from('lienclock_jobs')
      .select(JOB_COLUMNS, { count: 'exact' })
      .eq('user_id', user.id);
    if (statusFilter === 'current') query = query.neq('status', 'archived');
    else if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(pagination.from, pagination.to);
    if (error) return databaseError('We could not load your jobs right now. Try again in a moment.', error);

    const jobs = (data ?? []) as Job[];
    const nextDeadlineByJob: Record<string, UpcomingDeadlineSummary> = {};
    if (jobs.length > 0) {
      // QA-002: fetch the soonest upcoming deadline for every job on this page
      // in ONE query instead of a limit(1) fan-out per job. We order by
      // (job_id, due_date, id) and keep the first row seen per job_id, which is
      // that job's soonest upcoming deadline. Page size bounds the row count, so
      // Supabase's implicit 1000-row cap is never a risk here.
      const { data: upcomingRows, error: upcomingError } = await supabase
        .from('lienclock_deadlines')
        .select('id, job_id, deadline_type, due_date, is_estimated')
        .eq('user_id', user.id)
        .eq('status', 'upcoming')
        .in('job_id', jobs.map((job) => job.id))
        .order('job_id', { ascending: true })
        .order('due_date', { ascending: true })
        .order('id', { ascending: true });
      if (upcomingError) {
        return databaseError('We could not load deadlines for your jobs. Try again in a moment.', upcomingError);
      }
      for (const row of (upcomingRows ?? []) as UpcomingDeadlineSummary[]) {
        if (!nextDeadlineByJob[row.job_id]) nextDeadlineByJob[row.job_id] = row;
      }
    }

    const planContext = await getPlanContext(supabase, user.id);
    const activeJobs = await countJobs(supabase, user.id, 'active');
    const total = count ?? 0;

    return jsonOk({
      jobs: jobs.map((job) => ({
        ...job,
        next_deadline: nextDeadlineByJob[job.id] ? withDaysRemaining(nextDeadlineByJob[job.id]) : null,
      })),
      usage: {
        plan_code: planContext.plan_code,
        plan_name: planContext.plan_name,
        subscription_status: planContext.subscription_status,
        max_active_jobs: planContext.max_active_jobs,
        sms_reminders_included: planContext.sms_reminders_included,
        active_jobs: activeJobs,
        can_add_job: planContext.max_active_jobs === null || activeJobs < planContext.max_active_jobs,
      },
      pagination: paginationMeta(pagination, total, jobs.length),
    });
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = await enforceWriteLimit(request);
    if (limited) return limited;

    const auth = await requireUser();
    if ('response' in auth) return auth.response;
    const { supabase, user } = auth;

    const read = await readJsonBody(request);
    if ('response' in read) return read.response;
    const parsed = parseWith(createJobSchema, read.body);
    if ('response' in parsed) return parsed.response;
    const input = parsed.data;

    // QA-007: these four reads are independent, so run them concurrently to
    // trim serial round-trips from the activation-critical path before insert.
    const [coveredStates, planContext, activeJobs, totalJobs] = await Promise.all([
      getCoveredStates(supabase),
      getPlanContext(supabase, user.id),
      countJobs(supabase, user.id, 'active'),
      countJobs(supabase, user.id),
    ]);

    if (!coveredStates.includes(input.state_code)) {
      return jsonError(
        `LienClock does not cover ${input.state_code} yet. Covered states: ${coveredStates.join(', ')}.`,
        { status: 422, code: 'state_not_covered', details: { covered_states: coveredStates } }
      );
    }

    if (planContext.max_active_jobs !== null && activeJobs >= planContext.max_active_jobs) {
      const jobWord = planContext.max_active_jobs === 1 ? 'active job' : 'active jobs';
      return jsonError(
        `Your ${planContext.plan_name} plan tracks ${planContext.max_active_jobs} ${jobWord}. Upgrade to Pro for unlimited jobs, or archive a job you are done with.`,
        { status: 403, code: 'plan_limit_reached' }
      );
    }

    const isFirstJob = totalJobs === 0;

    const { data: jobRow, error: insertError } = await supabase
      .from('lienclock_jobs')
      .insert({
        user_id: user.id,
        product_id: 'lienclock',
        name: input.name,
        state_code: input.state_code,
        gc_name: input.gc_name,
        owner_name: input.owner_name ?? null,
        property_address: input.property_address ?? null,
        start_date: input.start_date,
        completion_date: input.completion_date ?? null,
        lien_filed_date: input.lien_filed_date ?? null,
        contract_amount: input.contract_amount ?? null,
        notes: input.notes ?? null,
      })
      .select(JOB_COLUMNS)
      .single();
    if (insertError || !jobRow) {
      return databaseError('We could not save this job. Try again in a moment.', insertError);
    }
    const job = jobRow as Job;

    const { data: deadlines, error: deadlinesError } = await supabase
      .from('lienclock_deadlines')
      .select(DEADLINE_COLUMNS)
      .eq('job_id', job.id)
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });
    if (deadlinesError) {
      return databaseError('The job saved but we could not load its deadlines. Refresh to see them.', deadlinesError);
    }

    // Law 116: tracking a first real job is the activation moment, emitted server-side only.
    if (isFirstJob) await trackServerEvent('activation', '/api/jobs');

    return jsonOk({ job, deadlines: (deadlines ?? []).map(withDaysRemaining) }, 201);
  } catch (error) {
    return unexpectedError(error);
  }
}
