// Automatic client follow-ups and proposal expiry. Pure functions so the
// daily cron, the API routes and the pages agree, and so they're testable.

const DAY = 86_400_000;

/** Days after the proposal was emailed that each reminder goes out. */
export const REMINDER_DAYS = [3, 7] as const;

/** YYYY-MM-DD for `date` in the given IANA time zone. */
export function dateIn(timeZone: string, date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * A proposal can be signed through the whole of its last day anywhere in
 * the world, so it only expires once that date has passed at UTC-12.
 */
export function isExpired(expiresOn: string | null | undefined, now = new Date()) {
  if (!expiresOn) return false;
  return dateIn("Etc/GMT+12", now) > expiresOn;
}

/** "Nov 4, 2026" for a YYYY-MM-DD date, without time zone drift. */
export function formatDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Accepts "", null or a real YYYY-MM-DD date; anything else is invalid. */
export function parseExpiry(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return undefined;
  }
  return value;
}

export interface FollowupState {
  status: string;
  client_email: string | null;
  sent_at: string | null;
  auto_remind: boolean | null;
  reminders_sent: number | null;
  expires_on: string | null;
}

/** When the next automatic reminder is due, or null if none will be sent. */
export function nextReminderAt(p: FollowupState): Date | null {
  if (!p.auto_remind || !p.sent_at || !p.client_email) return null;
  if (p.status !== "sent" && p.status !== "viewed") return null;
  const done = p.reminders_sent ?? 0;
  if (done >= REMINDER_DAYS.length) return null;
  const at = new Date(new Date(p.sent_at).getTime() + REMINDER_DAYS[done] * DAY);
  if (isExpired(p.expires_on, at)) return null;
  return at;
}

/** True when the daily run should send a reminder now. */
export function reminderDue(p: FollowupState, now = new Date()) {
  const at = nextReminderAt(p);
  return !!at && at.getTime() <= now.getTime() && !isExpired(p.expires_on, now);
}
