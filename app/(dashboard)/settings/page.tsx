'use client';
// CANONICAL: account settings, contact details, and the reminder schedule.
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiGet, apiSend } from '@/lib/core/api';
import { ToastViewport, useToasts } from '@/lib/core/toast';
import { BTN_PRIMARY, FieldError, INPUT_CLASS, LABEL_CLASS, Toggle } from '@/lib/core/ui';
import { cn } from '@/lib/core/format';
import type { Profile } from '@/lib/db/types';

const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'];
const REMINDER_CHOICES = [60, 30, 14, 7, 3, 1];

export default function SettingsPage() {
  const { toasts, success, error: toastError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('America/Chicago');
  const [emailReminders, setEmailReminders] = useState(true);
  const [smsReminders, setSmsReminders] = useState(false);
  const [reminderDays, setReminderDays] = useState<number[]>([30, 14, 7, 1]);
  const [smsIncluded, setSmsIncluded] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [profileResult, usageResult] = await Promise.all([
        apiGet<{ profile: Profile }>('/api/profile'),
        apiGet<{ usage: { sms_reminders_included: boolean } }>('/api/jobs?status=all&limit=1'),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (profileResult.failure) {
        setLoadError(profileResult.failure.message);
        return;
      }
      const profile = profileResult.data.profile;
      setEmail(profile.email);
      setFullName(profile.full_name ?? '');
      setCompanyName(profile.company_name ?? '');
      setPhone(profile.phone ?? '');
      setTimezone(profile.timezone);
      setEmailReminders(profile.email_reminders);
      setSmsReminders(profile.sms_reminders);
      setReminderDays([...profile.reminder_days].sort((a, b) => b - a));
      if (!usageResult.failure) setSmsIncluded(usageResult.data.usage.sms_reminders_included);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleDay(day: number) {
    const active = reminderDays.includes(day);
    if (active && reminderDays.length === 1) {
      toastError('Keep at least one reminder day.');
      return;
    }
    setReminderDays(active ? reminderDays.filter((item) => item !== day) : [...reminderDays, day].sort((a, b) => b - a));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = phone.replace(/[\s().-]/g, '');
    if (smsReminders && !normalizedPhone) {
      setFieldErrors({ phone: ['Add a phone number before turning on SMS reminders.'] });
      return;
    }
    setFieldErrors({});
    setSaving(true);
    const result = await apiSend<{ profile: Profile }>('/api/profile', 'PATCH', {
      full_name: fullName.trim() ? fullName.trim() : null,
      company_name: companyName.trim() ? companyName.trim() : null,
      phone: normalizedPhone ? normalizedPhone : null,
      timezone,
      email_reminders: emailReminders,
      sms_reminders: smsReminders,
      reminder_days: reminderDays,
    });
    setSaving(false);
    if (result.failure) {
      if (result.failure.details) setFieldErrors(result.failure.details);
      toastError(result.failure.message);
      return;
    }
    setPhone(result.data.profile.phone ?? '');
    success('Settings saved. Future reminders follow the new schedule.');
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="sr-only" role="status">Loading your settings</p>
        <div className="space-y-4" aria-hidden="true">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{loadError}</p>
        <button type="button" onClick={() => window.location.reload()} className={cn(BTN_PRIMARY, 'mt-4')}>Try again</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ToastViewport toasts={toasts} />
      <header>
        <h1 className="font-display text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">Who you are and how LienClock reminds you.</p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900">Contact details</h2>
          <div>
            <label htmlFor="settings-name" className={LABEL_CLASS}>Your name</label>
            <input id="settings-name" className={INPUT_CLASS} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} />
            <FieldError errors={fieldErrors.full_name} />
          </div>
          <div>
            <label htmlFor="settings-company" className={LABEL_CLASS}>Company</label>
            <input id="settings-company" className={INPUT_CLASS} value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={160} />
            <FieldError errors={fieldErrors.company_name} />
          </div>
          <div>
            <label htmlFor="settings-email" className={LABEL_CLASS}>Email</label>
            <input id="settings-email" className={cn(INPUT_CLASS, 'bg-slate-50 text-slate-500')} value={email} readOnly />
            <p className="mt-1 text-xs text-slate-400">Reminders go to this address. It is your sign in email.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-phone" className={LABEL_CLASS}>Phone <span className="font-normal text-slate-400">(for SMS)</span></label>
              <input id="settings-phone" type="tel" className={INPUT_CLASS} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+15551234567" />
              <FieldError errors={fieldErrors.phone} />
            </div>
            <div>
              <label htmlFor="settings-timezone" className={LABEL_CLASS}>Timezone</label>
              <select id="settings-timezone" className={INPUT_CLASS} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {(TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES]).map((zone) => (
                  <option key={zone} value={zone}>{zone.replace('_', ' ')}</option>
                ))}
              </select>
              <FieldError errors={fieldErrors.timezone} />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900">Reminders</h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Email reminders</p>
              <p className="mt-0.5 text-xs text-slate-500">Morning nudges ahead of every upcoming deadline.</p>
            </div>
            <Toggle checked={emailReminders} onChange={setEmailReminders} label="Email reminders" />
          </div>
          <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-sm font-medium text-slate-900">
                SMS reminders
                {!smsIncluded && <span className="ml-2 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">Pro</span>}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {smsIncluded ? 'Texts to your phone so nothing slips on a busy site day.' : (<>Part of the Pro plan. <Link href="/billing" className="underline">See plans</Link>.</>)}
              </p>
            </div>
            <Toggle checked={smsReminders} onChange={setSmsReminders} disabled={!smsIncluded && !smsReminders} label="SMS reminders" />
          </div>
          <fieldset className="border-t border-slate-100 pt-4">
            <legend className="sr-only">Reminder schedule</legend>
            <p className="text-sm font-medium text-slate-900">Days before each deadline</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {REMINDER_CHOICES.map((day) => {
                const active = reminderDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                      active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {day} {day === 1 ? 'day' : 'days'}
                  </button>
                );
              })}
            </div>
            <FieldError errors={fieldErrors.reminder_days} />
          </fieldset>
        </section>

        <div className="flex items-center justify-between gap-3">
          <Link href="/billing" className="text-sm font-medium text-brand-700 hover:underline">Manage plan and billing</Link>
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>{saving ? 'Saving...' : 'Save settings'}</button>
        </div>
      </form>
    </div>
  );
}
