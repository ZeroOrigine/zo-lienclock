// CANONICAL: public deadline calculator. Pure read that mirrors the database recalculation logic for instant previews.
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  addDaysUtc,
  dateStringSchema,
  daysFromToday,
  jsonError,
  jsonOk,
  parseWith,
  unexpectedError,
} from '@/lib/api/http';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveStateRules, getCoveredStates } from '@/lib/db/state-rules';
import type { AnchorEvent, DeadlineType } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

const calculateQuerySchema = z
  .object({
    state: z
      .string({ required_error: 'Pick the state where the job is located.' })
      .trim()
      .regex(/^[A-Za-z]{2}$/, 'Use the two letter state code, like TX.')
      .transform((value) => value.toUpperCase()),
    start: dateStringSchema('start date'),
    completion: dateStringSchema('completion date').optional(),
  })
  .superRefine((value, context) => {
    if (value.completion && value.completion < value.start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['completion'],
        message: 'The completion date cannot come before the start date.',
      });
    }
  });

interface CalculatedDeadline {
  deadline_type: DeadlineType;
  anchor_event: AnchorEvent;
  due_date: string | null;
  is_estimated: boolean;
  days_remaining: number | null;
  requires_completion_date: boolean;
  statute_citation: string;
  description: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = parseWith(calculateQuerySchema, {
      state: searchParams.get('state') ?? undefined,
      start: searchParams.get('start') ?? undefined,
      completion: searchParams.get('completion') ?? undefined,
    });
    if ('response' in parsed) return parsed.response;
    const input = parsed.data;

    const supabase = createSupabaseServerClient();
    const rules = await getActiveStateRules(supabase, input.state);
    if (rules.length === 0) {
      const coveredStates = await getCoveredStates(supabase);
      return jsonError(
        `LienClock does not cover ${input.state} yet. Covered states: ${coveredStates.join(', ')}.`,
        { status: 404, code: 'state_not_covered', details: { covered_states: coveredStates } }
      );
    }

    const items: CalculatedDeadline[] = [];
    let lienFilingDue: string | null = null;

    for (const rule of rules.filter((candidate) => candidate.anchor_event !== 'lien_filing')) {
      const anchor = rule.anchor_event === 'job_start' ? input.start : input.completion ?? null;
      if (!anchor) {
        items.push({
          deadline_type: rule.deadline_type,
          anchor_event: rule.anchor_event,
          due_date: null,
          is_estimated: true,
          days_remaining: null,
          requires_completion_date: true,
          statute_citation: rule.statute_citation,
          description: rule.notes,
        });
        continue;
      }
      const dueDate = addDaysUtc(anchor, rule.offset_days);
      if (rule.deadline_type === 'lien_filing') lienFilingDue = dueDate;
      items.push({
        deadline_type: rule.deadline_type,
        anchor_event: rule.anchor_event,
        due_date: dueDate,
        is_estimated: false,
        days_remaining: daysFromToday(dueDate),
        requires_completion_date: false,
        statute_citation: rule.statute_citation,
        description: rule.notes,
      });
    }

    for (const rule of rules.filter((candidate) => candidate.anchor_event === 'lien_filing')) {
      if (!lienFilingDue) {
        items.push({
          deadline_type: rule.deadline_type,
          anchor_event: rule.anchor_event,
          due_date: null,
          is_estimated: true,
          days_remaining: null,
          requires_completion_date: true,
          statute_citation: rule.statute_citation,
          description: rule.notes,
        });
        continue;
      }
      const dueDate = addDaysUtc(lienFilingDue, rule.offset_days);
      items.push({
        deadline_type: rule.deadline_type,
        anchor_event: rule.anchor_event,
        due_date: dueDate,
        is_estimated: true,
        days_remaining: daysFromToday(dueDate),
        requires_completion_date: false,
        statute_citation: rule.statute_citation,
        description: rule.notes,
      });
    }

    items.sort((first, second) => {
      if (first.due_date === null && second.due_date === null) return 0;
      if (first.due_date === null) return 1;
      if (second.due_date === null) return -1;
      if (first.due_date < second.due_date) return -1;
      if (first.due_date > second.due_date) return 1;
      return 0;
    });

    return jsonOk(
      {
        state_code: input.state,
        start_date: input.start,
        completion_date: input.completion ?? null,
        deadlines: items,
        disclaimer:
          'These dates come from commonly published statutory windows and are for planning. Some states shorten a window based on notices or project type, so read each note. LienClock is not legal advice and never files anything for you.',
      },
      200,
      { 'Cache-Control': 'public, s-maxage=300' }
    );
  } catch (error) {
    return unexpectedError(error);
  }
}
