import { notFound } from "next/navigation";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { loadEntitlement } from "@/lib/billing";
import { isUuid } from "@/lib/validate";
import { PublicProposalClient } from "./PublicProposalClient";

export const dynamic = "force-dynamic";

export default async function PublicProposalPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { deposit?: string };
}) {
  if (!isUuid(params.id)) notFound();
  const supabase = createServiceClient();

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

  // Track the client's first open. The sender previewing their own link
  // doesn't count, and a signed proposal is never downgraded.
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!proposal.viewed_at && user?.id !== proposal.user_id) {
    const nextStatus = proposal.status === "signed" ? "signed" : "viewed";
    await supabase
      .from("proposals")
      .update({ viewed_at: new Date().toISOString(), status: nextStatus })
      .eq("id", proposal.id)
      .eq("status", proposal.status);
    proposal.viewed_at = new Date().toISOString();
    proposal.status = nextStatus;
  }

  return (
    <PublicProposalClient
      proposal={{
        id: proposal.id,
        title: proposal.title,
        client_name: proposal.client_name,
        content: proposal.content,
        status: proposal.status,
        deposit_amount: proposal.deposit_amount,
        deposit_paid: proposal.deposit_paid,
      }}
      businessName={profile?.business_name ?? null}
      showBranding={entitlement.showBranding}
      depositsEnabled={!!profile?.charges_enabled}
      depositJustPaid={searchParams.deposit === "success"}
    />
  );
}
