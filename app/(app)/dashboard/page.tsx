import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: proposals } = await supabase
    .from("proposals")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return <DashboardClient initialProposals={proposals ?? []} />;
}
