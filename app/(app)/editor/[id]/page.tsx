import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loadEntitlement } from "@/lib/billing";
import { emailConfigured } from "@/lib/resend";
import { safeBackHref } from "@/lib/dashboard-filter";
import { EditorClient } from "./EditorClient";

export default async function EditorPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string | string[] }>;
}) {
  const params = await props.params;
  const backHref = safeBackHref((await props.searchParams).back);
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!proposal) notFound();

  const [{ profile, entitlement }, { data: signature }] = await Promise.all([
    loadEntitlement(supabase, proposal.user_id),
    proposal.status === "signed"
      ? supabase
          .from("signatures")
          .select("signer_name")
          .eq("proposal_id", proposal.id)
          .order("signed_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <EditorClient
      proposal={proposal}
      canEdit={entitlement.canEdit}
      payoutsReady={!!profile?.charges_enabled}
      emailReady={emailConfigured()}
      backHref={backHref}
      signerName={signature?.signer_name ?? null}
    />
  );
}
