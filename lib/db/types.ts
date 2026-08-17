// CANONICAL: shared LienClock domain types and explicit column lists (single source of truth, never select star).
export type JobStatus = 'active' | 'completed' | 'archived';
export type DeadlineType = 'preliminary_notice' | 'notice_of_intent' | 'lien_filing' | 'enforcement';
export type AnchorEvent = 'job_start' | 'job_completion' | 'lien_filing';
export type DeadlineStatus = 'upcoming' | 'completed' | 'missed' | 'not_applicable';
export type ReminderChannel = 'email' | 'sms';
export type ReminderStatus = 'pending' | 'sent' | 'failed' | 'canceled';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused';

export const JOB_COLUMNS =
  'id, name, state_code, gc_name, owner_name, property_address, start_date, completion_date, lien_filed_date, contract_amount, status, notes, created_at, updated_at';
export const DEADLINE_COLUMNS =
  'id, job_id, deadline_type, anchor_event, due_date, is_estimated, status, completed_at, statute_citation, description, created_at, updated_at';
export const REMINDER_COLUMNS =
  'id, deadline_id, channel, days_before, remind_at, status, sent_at, created_at';
export const PROFILE_COLUMNS =
  'id, email, full_name, company_name, phone, role, timezone, email_reminders, sms_reminders, reminder_days, created_at, updated_at';
export const PLAN_COLUMNS =
  'id, code, name, description, price_cents, billing_interval, max_active_jobs, sms_reminders, is_active, sort_order';
export const STATE_RULE_COLUMNS =
  'id, state_code, deadline_type, anchor_event, offset_days, statute_citation, notes';

export interface Job {
  id: string;
  name: string;
  state_code: string;
  gc_name: string;
  owner_name: string | null;
  property_address: string | null;
  start_date: string;
  completion_date: string | null;
  lien_filed_date: string | null;
  contract_amount: number | null;
  status: JobStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deadline {
  id: string;
  job_id: string;
  deadline_type: DeadlineType;
  anchor_event: AnchorEvent;
  due_date: string;
  is_estimated: boolean;
  status: DeadlineStatus;
  completed_at: string | null;
  statute_citation: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  deadline_id: string;
  channel: ReminderChannel;
  days_before: number;
  remind_at: string;
  status: ReminderStatus;
  sent_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  role: 'user' | 'admin';
  timezone: string;
  email_reminders: boolean;
  sms_reminders: boolean;
  reminder_days: number[];
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_cents: number;
  billing_interval: 'month' | 'year';
  max_active_jobs: number | null;
  sms_reminders: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface StateRule {
  id: string;
  state_code: string;
  deadline_type: DeadlineType;
  anchor_event: AnchorEvent;
  offset_days: number;
  statute_citation: string;
  notes: string;
}
