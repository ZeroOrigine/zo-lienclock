// CANONICAL: profile API for contact details and reminder preferences, with SMS gated by plan entitlement.
import type { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  databaseError,
  definedFields,
  enforceWriteLimit,
  jsonError,
  jsonOk,
  parseWith,
  readJsonBody,
  requireUser,
  unexpectedError,
} from '@/lib/api/http';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getPlanContext } from '@/lib/db/subscription';
import { PROFILE_COLUMNS, type Profile } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

const updateProfileSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(1, 'Your name cannot be empty.')
      .max(120, 'Keep your name under 120 characters.')
      .optional()
      .nullable(),
    company_name: z
      .string()
      .trim()
      .max(160, 'Keep the company name under 160 characters.')
      .optional()
      .nullable(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[1-9]\d{6,14}$/, 'Enter your phone in international format, like +15551234567.')
      .optional()
      .nullable(),
    timezone: z
      .string()
      .trim()
      .min(1, 'Enter a timezone.')
      .max(64, 'That timezone name is too long.')
      .refine(isValidTimezone, 'Use an IANA timezone name, like America/Chicago.')
      .optional(),
    email_reminders: z.boolean({ invalid_type_error: 'Email reminders must be true or false.' }).optional(),
    sms_reminders: z.boolean({ invalid_type_error: 'SMS reminders must be true or false.' }).optional(),
    reminder_days: z
      .array(
        z
          .number({ invalid_type_error: 'Reminder days must be numbers.' })
          .int('Reminder days must be whole numbers.')
          .min(0, 'Reminder days cannot be negative.')
          .max(120, 'Reminders can run at most 120 days ahead.'),
        { invalid_type_error: 'Send reminder days as a list of numbers.' }
      )
      .min(1, 'Keep at least one reminder day.')
      .max(6, 'Choose up to six reminder days.')
      .optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Send at least one field to update.',
  });

async function ensureProfile(
  supabase: SupabaseClient,
  user: User
): Promise<{ profile: Profile } | { response: NextResponse }> {
  const { data: existing, error } = await supabase
    .from('lienclock_profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    return { response: databaseError('We could not load your profile right now. Try again in a moment.', error) };
  }
  if (existing) return { profile: existing as Profile };

  // Defensive rebuild for the rare case where the signup trigger has not run yet.
  const metadataName =
    typeof user.user_metadata?.full_name === 'string' ? (user.user_metadata.full_name as string) : null;
  const serviceClient = createServiceRoleClient();
  const { data: created, error: insertError } = await serviceClient
    .from('lienclock_profiles')
    .insert({ id: user.id, email: user.email ?? 'unknown', full_name: metadataName })
    .select(PROFILE_COLUMNS)
    .single();
  if (insertError || !created) {
    const { data: retry } = await supabase
      .from('lienclock_profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .maybeSingle();
    if (retry) return { profile: retry as Profile };
    return {
      response: databaseError('We could not load your profile. Sign out, sign back in, and try again.', insertError),
    };
  }
  return { profile: created as Profile };
}

export async function GET() {
  try {
    const auth = await requireUser();
    if ('response' in auth) return auth.response;
    const ensured = await ensureProfile(auth.supabase, auth.user);
    if ('response' in ensured) return ensured.response;
    return jsonOk({ profile: ensured.profile });
  } catch (error) {
    return unexpectedError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const limited = await enforceWriteLimit(request);
    if (limited) return limited;

    const auth = await requireUser();
    if ('response' in auth) return auth.response;
    const { supabase, user } = auth;

    const read = await readJsonBody(request);
    if ('response' in read) return read.response;
    const parsed = parseWith(updateProfileSchema, read.body);
    if ('response' in parsed) return parsed.response;
    const input = parsed.data;

    const ensured = await ensureProfile(supabase, user);
    if ('response' in ensured) return ensured.response;
    const existing = ensured.profile;

    if (input.sms_reminders === true) {
      const planContext = await getPlanContext(supabase, user.id);
      if (!planContext.sms_reminders_included) {
        return jsonError('SMS reminders are part of the Pro plan. Upgrade to turn them on.', {
          status: 403,
          code: 'plan_upgrade_required',
        });
      }
    }

    const smsEnabledAfter = input.sms_reminders ?? existing.sms_reminders;
    const phoneAfter = input.phone === undefined ? existing.phone : input.phone;
    if (smsEnabledAfter && !phoneAfter) {
      const message =
        input.phone === null
          ? 'Turn off SMS reminders before removing your phone number.'
          : 'Add a phone number before turning on SMS reminders.';
      return jsonError(message, { status: 422, code: 'phone_required' });
    }

    const normalizedReminderDays = input.reminder_days
      ? Array.from(new Set(input.reminder_days)).sort((first, second) => second - first)
      : undefined;

    const updates = definedFields({
      full_name: input.full_name,
      company_name: input.company_name,
      phone: input.phone,
      timezone: input.timezone,
      email_reminders: input.email_reminders,
      sms_reminders: input.sms_reminders,
      reminder_days: normalizedReminderDays,
    });

    const { data: updatedRow, error: updateError } = await supabase
      .from('lienclock_profiles')
      .update(updates)
      .eq('id', user.id)
      .select(PROFILE_COLUMNS)
      .single();
    if (updateError || !updatedRow) {
      return databaseError('We could not save your settings. Try again in a moment.', updateError);
    }

    const reminderFieldsTouched =
      input.email_reminders !== undefined ||
      input.sms_reminders !== undefined ||
      input.phone !== undefined ||
      input.reminder_days !== undefined;
    if (reminderFieldsTouched) {
      // Rebuild pending reminders once per user via a set-based RPC instead of touching every
      // deadline row (which re-fired the per-row sync trigger and caused O(n^2) reminder churn).
      const { error: resyncError } = await supabase.rpc('lienclock_sync_deadline_reminders', {
        p_user_id: user.id,
      });
      if (resyncError) console.error('[lienclock] reminder resync failed:', resyncError);
    }

    return jsonOk({ profile: updatedRow as Profile });
  } catch (error) {
    return unexpectedError(error);
  }
}
