// CANONICAL: state rule catalog access; the database is the only source of truth for coverage.
import type { SupabaseClient } from '@supabase/supabase-js';
import { STATE_RULE_COLUMNS, type StateRule } from '@/lib/db/types';

export async function getActiveStateRules(client: SupabaseClient, stateCode?: string): Promise<StateRule[]> {
  let query = client
    .from('lienclock_state_rules')
    .select(STATE_RULE_COLUMNS)
    .eq('is_active', true)
    .order('state_code', { ascending: true })
    .order('deadline_type', { ascending: true });
  if (stateCode) query = query.eq('state_code', stateCode);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StateRule[];
}

export async function getCoveredStates(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client
    .from('lienclock_state_rules')
    .select('state_code')
    .eq('is_active', true);
  if (error) throw error;
  const codes = (data ?? []).map((row) => row.state_code as string);
  return Array.from(new Set(codes)).sort();
}
