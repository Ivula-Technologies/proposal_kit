import { createClient } from "@/lib/supabase/server";
import { parseDashboardFilter } from "@/lib/dashboard-filter";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const initialFilter = parseDashboardFilter(await props.searchParams);
  const supabase = await createClient();
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
      initialFilter={initialFilter}
      hasBusinessName={!!profile?.business_name}
      payoutsReady={!!profile?.charges_enabled}
    />
  );
}
