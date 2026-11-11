import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { loadEntitlement } from "@/lib/billing";
import { contentVersion } from "@/lib/content-version";
import { formatDay, isExpired } from "@/lib/followups";
import { isUuid } from "@/lib/validate";
import { PublicProposalClient } from "./PublicProposalClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  // Proposals are private to whoever has the link.
  const robots = { index: false, follow: false };
  if (!isUuid(params.id)) return { robots };
  const { data } = await createServiceClient()
    .from("proposals")
    .select("title")
    .eq("id", params.id)
    .maybeSingle();
  return { title: data?.title ? `${data.title} | Proposal` : "Proposal", robots };
}

export default async function PublicProposalPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ deposit?: string }>;
}) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
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

  // The client's first open is recorded by the page itself once it loads
  // (/api/proposals/[id]/view), so link scanners don't count as opens.
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const isOwner = user?.id === proposal.user_id;

  return (
    <PublicProposalClient
      proposal={{
        id: proposal.id,
        title: proposal.title,
        client_name: proposal.client_name,
        content: proposal.content,
        status: proposal.status,
        deposit_amount: proposal.deposit_amount,
        deposit_percent: proposal.deposit_percent,
        deposit_paid: proposal.deposit_paid,
      }}
      declined={proposal.status === "declined"}
      version={contentVersion(proposal.content)}
      businessName={profile?.business_name ?? null}
      showBranding={entitlement.showBranding}
      depositsEnabled={!!profile?.charges_enabled}
      depositJustPaid={searchParams.deposit === "success"}
      isOwnerPreview={isOwner}
      trackView={!isOwner && !proposal.viewed_at}
      contactEmail={profile?.email ?? null}
      validUntil={proposal.expires_on ? formatDay(proposal.expires_on) : null}
      expired={isExpired(proposal.expires_on)}
    />
  );
}
