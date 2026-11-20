import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceClient } from "@/lib/supabase/server";

// Small, self-hosted operations helpers. Errors land in the app_events table
// (no extra service to sign up for), the daily cron emails a digest of them,
// and /api/health reports when the daily cron last ran.

const MAX_PER_MINUTE = 30;
let windowStart = 0;
let windowCount = 0;

function describe(err: unknown) {
  if (err instanceof Error) return { message: err.message, detail: err.stack ?? null };
  if (typeof err === "string") return { message: err, detail: null };
  try {
    return { message: JSON.stringify(err), detail: null };
  } catch {
    return { message: String(err), detail: null };
  }
}

/**
 * Logs a server error and records it for the daily digest. Never throws, and
 * stops recording past 30 a minute so a failure loop can't flood the table.
 */
export async function reportError(source: string, err: unknown, context?: string) {
  console.error(`[${source}]${context ? ` ${context}` : ""}`, err);
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  if (++windowCount > MAX_PER_MINUTE) return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const { message, detail } = describe(err);
  try {
    await createServiceClient()
      .from("app_events")
      .insert({
        level: "error",
        source: source.slice(0, 100),
        message: [context, message].filter(Boolean).join(": ").slice(0, 1000),
        detail: detail?.slice(0, 4000) ?? null,
      });
  } catch (insertErr) {
    console.error("[ops] couldn't record error", insertErr);
  }
}

export async function markCronRun(supabase: SupabaseClient, name: string) {
  await supabase
    .from("app_status")
    .upsert({ key: `cron:${name}`, value: new Date().toISOString(), updated_at: new Date().toISOString() });
}

export async function lastCronRun(supabase: SupabaseClient, name: string) {
  const { data } = await supabase
    .from("app_status")
    .select("value")
    .eq("key", `cron:${name}`)
    .maybeSingle();
  return data?.value ? new Date(data.value) : null;
}

/** "ok", "never" (no run recorded yet) or "stale" (none in the last 26 hours). */
export function cronHealth(last: Date | null, now = new Date()) {
  if (!last || Number.isNaN(last.getTime())) return "never" as const;
  return now.getTime() - last.getTime() > 26 * 3_600_000 ? ("stale" as const) : ("ok" as const);
}

export interface ErrorSummary {
  source: string;
  count: number;
  latest: string;
}

/** Errors since a time, grouped by where they happened, most frequent first. */
export function summarizeErrors(rows: { source: string; message: string }[]): ErrorSummary[] {
  const groups = new Map<string, ErrorSummary>();
  for (const row of rows) {
    const group = groups.get(row.source);
    if (group) group.count++;
    else groups.set(row.source, { source: row.source, count: 1, latest: row.message });
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

/** Deletes recorded events older than 30 days so the table stays small. */
export async function pruneEvents(supabase: SupabaseClient, now = new Date()) {
  const cutoff = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  await supabase.from("app_events").delete().lt("created_at", cutoff);
}
