// CANONICAL: shared HTTP helpers for every LienClock API route (responses, auth, validation, pagination, rate limit).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { rateLimitCheck, clientIp } from '@/lib/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

export function jsonOk<T>(data: T, status = 200, headers?: HeadersInit): NextResponse {
  return NextResponse.json({ data, error: null }, { status, headers });
}

export function jsonError(
  message: string,
  options: { status: number; code: string; details?: unknown }
): NextResponse {
  const body: { data: null; error: string; code: string; details?: unknown } = {
    data: null,
    error: message,
    code: options.code,
  };
  if (options.details !== undefined) body.details = options.details;
  return NextResponse.json(body, { status: options.status });
}

export function unexpectedError(error: unknown): NextResponse {
  console.error('[lienclock] unexpected error:', error);
  return jsonError('Our server had trouble with that request. Wait a moment and try again.', {
    status: 500,
    code: 'internal_error',
  });
}

export function databaseError(message: string, error: unknown): NextResponse {
  console.error('[lienclock] database error:', error);
  return jsonError(message, { status: 500, code: 'database_error' });
}

export async function requireUser(): Promise<AuthContext | { response: NextResponse }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { response: jsonError('Sign in to continue.', { status: 401, code: 'unauthorized' }) };
  }
  return { supabase, user: data.user };
}

// The single rate limit configuration for every LienClock write surface.
// NOTE: rateLimitCheck is backed by per-instance memory, so on serverless this is
// best-effort only — counters reset on cold starts and are not shared across
// instances. Treat it as a nuisance brake, not a security boundary.
// Authenticated writes are keyed on the Supabase user id, never the spoofable
// x-forwarded-for header. Call this after requireUser and pass the user to skip an
// extra session lookup; the client IP is only a last-resort key for sessionless
// callers, whose writes are rejected by requireUser anyway.
export async function enforceWriteLimit(request: Request, user?: User): Promise<NextResponse | null> {
  let limitKey: string | null = user ? `user:${user.id}` : null;
  if (!limitKey) {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) limitKey = `user:${data.user.id}`;
  }
  const verdict = await rateLimitCheck('lienclock_write', limitKey ?? `ip:${clientIp(request)}`, 120, 5000);
  if (!verdict.allowed) {
    return NextResponse.json(
      { data: null, error: 'Too many requests for today. The counter resets tomorrow.', code: 'rate_limited' },
      { status: 429 }
    );
  }
  return null;
}

export async function readJsonBody(request: Request): Promise<{ body: unknown } | { response: NextResponse }> {
  try {
    return { body: await request.json() };
  } catch {
    return {
      response: jsonError('We could not read that request. Send a valid JSON body.', {
        status: 400,
        code: 'invalid_json',
      }),
    };
  }
}

export function parseWith<S extends z.ZodTypeAny>(
  schema: S,
  payload: unknown
): { data: z.infer<S> } | { response: NextResponse } {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : 'body';
      if (!fieldErrors[key]) fieldErrors[key] = [];
      fieldErrors[key].push(issue.message);
    }
    return {
      response: jsonError('Check the highlighted fields and try again.', {
        status: 400,
        code: 'validation_failed',
        details: fieldErrors,
      }),
    };
  }
  return { data: result.data };
}

export interface Pagination {
  page: number;
  limit: number;
  from: number;
  to: number;
}

export function parsePagination(searchParams: URLSearchParams): Pagination {
  const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const rawLimit = Number.parseInt(searchParams.get('limit') ?? '20', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;
  const from = (page - 1) * limit;
  return { page, limit, from, to: from + limit - 1 };
}

export function paginationMeta(pagination: Pagination, total: number, returnedCount: number) {
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    has_more: pagination.from + returnedCount < total,
  };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isRealCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1990 || year > 2100) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function dateStringSchema(label: string) {
  return z
    .string({
      required_error: `Enter the ${label}.`,
      invalid_type_error: `Enter the ${label} in YYYY-MM-DD format, like 2026-03-15.`,
    })
    .regex(DATE_PATTERN, `Enter the ${label} in YYYY-MM-DD format, like 2026-03-15.`)
    .refine(isRealCalendarDate, `That ${label} is not a real calendar date between 1990 and 2100.`);
}

export const uuidSchema = z.string().uuid('That id is not valid.');

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysUtc(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysFromToday(dateIso: string): number {
  const target = new Date(`${dateIso}T00:00:00Z`).getTime();
  const today = new Date(`${todayUtc()}T00:00:00Z`).getTime();
  return Math.round((target - today) / 86400000);
}

export function withDaysRemaining<T extends { due_date: string }>(row: T): T & { days_remaining: number } {
  return { ...row, days_remaining: daysFromToday(row.due_date) };
}

export function definedFields<T extends Record<string, unknown>>(source: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) (result as Record<string, unknown>)[key] = value;
  }
  return result;
}
