import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: proposals }, { data: profile }] = await Promise.all([
    supabase
      .from("proposals")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("business_name, charges_enabled")
      .eq("id", user!.id)
      .maybeSingle(),
  ]);

  return (
    <DashboardClient
      initialProposals={proposals ?? []}
      hasBusinessName={!!profile?.business_name}
      payoutsReady={!!profile?.charges_enabled}
    />
  );
}
