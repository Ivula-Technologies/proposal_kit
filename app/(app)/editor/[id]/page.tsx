import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loadEntitlement } from "@/lib/billing";
import { EditorClient } from "./EditorClient";

export default async function EditorPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!proposal) notFound();

  const { profile, entitlement } = await loadEntitlement(
    supabase,
    proposal.user_id
  );

  return (
    <EditorClient
      proposal={proposal}
      canEdit={entitlement.canEdit}
      payoutsReady={!!profile?.charges_enabled}
    />
  );
}
