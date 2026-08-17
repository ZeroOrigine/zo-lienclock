// CANONICAL: public state coverage API listing every statutory rule LienClock tracks, grouped by state.
import type { NextRequest } from 'next/server';
import {
  jsonError,
  jsonOk,
  unexpectedError,
} from '@/lib/api/http';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getActiveStateRules, getCoveredStates } from '@/lib/db/state-rules';
import type { StateRule } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const stateParam = request.nextUrl.searchParams.get('state');
    if (stateParam !== null && !/^[A-Za-z]{2}$/.test(stateParam.trim())) {
      return jsonError('Use the two letter state code, like TX.', { status: 400, code: 'invalid_filter' });
    }
    const stateCode = stateParam ? stateParam.trim().toUpperCase() : undefined;

    const supabase = createSupabaseServerClient();
    const rules = await getActiveStateRules(supabase, stateCode);

    if (stateCode && rules.length === 0) {
      const coveredStates = await getCoveredStates(supabase);
      return jsonError(
        `LienClock does not cover ${stateCode} yet. Covered states: ${coveredStates.join(', ')}.`,
        { status: 404, code: 'state_not_covered', details: { covered_states: coveredStates } }
      );
    }

    const grouped = new Map<string, StateRule[]>();
    for (const rule of rules) {
      const list = grouped.get(rule.state_code) ?? [];
      list.push(rule);
      grouped.set(rule.state_code, list);
    }
    const states = Array.from(grouped.entries()).map(([code, stateRules]) => ({
      state_code: code,
      rules: stateRules,
    }));

    return jsonOk(
      { covered_states: Array.from(grouped.keys()), states },
      200,
      { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    );
  } catch (error) {
    return unexpectedError(error);
  }
}
