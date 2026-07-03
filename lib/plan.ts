import type { SupabaseClient } from "@supabase/supabase-js";

export const PLAN_LIMITS: Record<string, number | null> = {
  free: 1,
  solo: 5,
  pro: null, // unlimited
  agency: null, // unlimited
};

export async function getActiveProposalCount(
  supabase: SupabaseClient,
  userId: string
) {
  const { count } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return count ?? 0;
}

export async function canCreateProposal(
  supabase: SupabaseClient,
  userId: string,
  plan: string
) {
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  if (limit === null) return true;

  const count = await getActiveProposalCount(supabase, userId);
  return count < limit;
}
