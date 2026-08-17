// CANONICAL: shared daily rate limiter for LienClock write and billing surfaces.
// Semantics: rateLimitCheck(bucket, key, perKeyDailyLimit, bucketDailyLimit).
// Backed by the lienclock_rate_limits table (upserted via the service role) so
// counters survive serverless cold starts and are shared across every instance,
// keyed on bucket:key over a UTC-day window. A per-instance in-memory map is kept
// only as a fallback when the shared store is unreachable.
// Fails OPEN on any internal error so an infra hiccup never blocks a paying user;
// every route this guards also requires auth and is protected by RLS.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface RateLimitVerdict {
  allowed: boolean;
  remaining: number;
}

const counters = new Map<string, { day: string; count: number }>();

let serviceClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient | null {
  if (serviceClient) return serviceClient;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serviceClient;
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

// Atomically increments the shared counter for one bucket:key and returns the
// running total for the current UTC day. Throws if the shared store is
// unavailable so the caller can fall back to the in-memory map.
async function bumpShared(bucket: string, key: string): Promise<number> {
  const client = getServiceClient();
  if (!client) throw new Error('rate-limit shared store unavailable');
  const rpcArgs = { p_bucket: bucket, p_key: key, p_day: utcDay() };
  // Cast: on an untyped client, supabase-js resolves rpc Args to `undefined`/`never`
  // depending on version; `never` is assignable everywhere so this compiles on all.
  const { data, error } = await client.rpc('lienclock_rate_limit_bump', rpcArgs as never);
  if (error) throw error;
  const count = typeof data === 'number' ? data : Number(data);
  if (!Number.isFinite(count)) throw new Error('rate-limit shared store returned no count');
  return count;
}

function bump(mapKey: string, limit: number): RateLimitVerdict {
  const day = utcDay();
  const entry = counters.get(mapKey);
  if (!entry || entry.day !== day) {
    counters.set(mapKey, { day, count: 1 });
    return { allowed: 1 <= limit, remaining: Math.max(0, limit - 1) };
  }
  entry.count += 1;
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

export async function rateLimitCheck(
  bucket: string,
  key: string,
  perKeyDailyLimit: number,
  bucketDailyLimit: number
): Promise<RateLimitVerdict> {
  try {
    try {
      const [perKeyCount, bucketCount] = await Promise.all([
        bumpShared(bucket, key),
        bumpShared(bucket, '__all__'),
      ]);
      return {
        allowed: perKeyCount <= perKeyDailyLimit && bucketCount <= bucketDailyLimit,
        remaining: Math.max(
          0,
          Math.min(perKeyDailyLimit - perKeyCount, bucketDailyLimit - bucketCount)
        ),
      };
    } catch {
      // Shared store unreachable: fall back to per-instance best-effort counters.
    }
    if (counters.size > 10000) {
      const day = utcDay();
      counters.forEach((value, mapKey) => {
        if (value.day !== day) counters.delete(mapKey);
      });
    }
    const perKey = bump(`${bucket}:${key}`, perKeyDailyLimit);
    const wholeBucket = bump(`${bucket}:__all__`, bucketDailyLimit);
    return {
      allowed: perKey.allowed && wholeBucket.allowed,
      remaining: Math.min(perKey.remaining, wholeBucket.remaining),
    };
  } catch {
    return { allowed: true, remaining: 0 };
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get('x-real-ip');
  if (real && real.trim()) return real.trim();
  return 'unknown';
}
