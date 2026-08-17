// CANONICAL: shared formatting helpers, deadline labels, urgency styling, and the single US state name list.
// STATE_NAMES / stateName defined here are the ONLY copy — all pages must import from '@/lib/core/format'.
export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

export function stateName(code: string): string {
  return STATE_NAMES[code] ?? code;
}

export const DEADLINE_TYPE_LABELS: Record<string, string> = {
  preliminary_notice: 'Preliminary notice',
  notice_of_intent: 'Notice of intent',
  lien_filing: 'Lien filing',
  enforcement: 'Enforcement suit',
};

export const ANCHOR_LABELS: Record<string, string> = {
  job_start: 'from job start',
  job_completion: 'from completion',
  lien_filing: 'from the lien filing',
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function daysRemainingLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} past`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days left`;
}

export type Urgency = 'past' | 'critical' | 'soon' | 'clear';

export function urgencyFor(days: number): Urgency {
  if (days < 0) return 'past';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'soon';
  return 'clear';
}

export const URGENCY_BADGE: Record<Urgency, string> = {
  past: 'border-red-200 bg-red-100 text-red-800',
  critical: 'border-red-200 bg-red-50 text-red-700',
  soon: 'border-amber-200 bg-amber-50 text-amber-800',
  clear: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function formatMoney(cents: number): string {
  const whole = cents % 100 === 0;
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
