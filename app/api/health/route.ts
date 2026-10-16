import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/health - for UptimeRobot or any monitor. 200 when the required
// settings are present and the database answers, otherwise 503 with the
// names (never the values) of what's missing.
const REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_CONNECT_WEBHOOK_SECRET",
  "STRIPE_PRICE_SOLO",
  "STRIPE_PRICE_PRO",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "CRON_SECRET",
];

export async function GET() {
  const missing = REQUIRED.filter((name) => !process.env[name]);

  let database = "skipped";
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { error } = await createServiceClient()
        .from("profiles")
        .select("id", { head: true, count: "exact" })
        .limit(1);
      database = error ? "error" : "ok";
    } catch {
      database = "error";
    }
  }

  const ok = missing.length === 0 && database === "ok";
  return Response.json(
    { ok, database, missing, time: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
