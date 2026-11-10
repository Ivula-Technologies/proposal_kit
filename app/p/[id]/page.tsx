import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { createServiceClient } from "@/lib/supabase/server";
import { renderProposalContentHtml } from "@/lib/tiptap";
import { PublicProposalClient } from "./PublicProposalClient";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = createServiceClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("title")
    .eq("id", params.id)
    .single();

  return {
    title: proposal ? `${proposal.title} — ProposalKit` : "Proposal",
    robots: { index: false }, // private share links stay out of search engines
  };
}

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

  // Render the TipTap document to HTML on the server, so the client
  // downloads no editor JavaScript at all.
  const contentHtml = renderProposalContentHtml(proposal.content);

  return (
    <PublicProposalClient
      proposal={proposal}
      contentHtml={contentHtml}
      depositJustPaid={searchParams.deposit === "success"}
    />
  );
}
