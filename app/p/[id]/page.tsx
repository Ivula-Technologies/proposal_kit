import { notFound } from "next/navigation";

import { createServiceClient } from "@/lib/supabase/server";
import { PublicProposalClient } from "./PublicProposalClient";

export default async function PublicProposalPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { deposit?: string };
}) {
  const supabase = createServiceClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!proposal) notFound();

  // Track first open — never downgrade a proposal that's already signed.
  if (!proposal.viewed_at) {
    const nextStatus = proposal.status === "signed" ? "signed" : "viewed";
    await supabase
      .from("proposals")
      .update({ viewed_at: new Date().toISOString(), status: nextStatus })
      .eq("id", proposal.id);
    proposal.viewed_at = new Date().toISOString();
    proposal.status = nextStatus;
  }

  return (
    <PublicProposalClient
      proposal={proposal}
      depositJustPaid={searchParams.deposit === "success"}
    />
  );
}
