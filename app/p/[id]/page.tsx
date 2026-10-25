import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { appUrl, loadEntitlement } from "@/lib/billing";
import { sendOwnerNotice } from "@/lib/resend";
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

  // Track the client's first open and tell the sender. The sender
  // previewing their own link doesn't count, and a signed proposal is never
  // downgraded.
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const isOwner = user?.id === proposal.user_id;
  if (!proposal.viewed_at && !isOwner) {
    const nextStatus = proposal.status === "signed" ? "signed" : "viewed";
    const viewedAt = new Date().toISOString();
    const { data: claimed } = await supabase
      .from("proposals")
      .update({ viewed_at: viewedAt, status: nextStatus })
      .eq("id", proposal.id)
      .eq("status", proposal.status)
      .is("viewed_at", null)
      .select("id");
    proposal.viewed_at = viewedAt;
    proposal.status = nextStatus;

    if (claimed?.length && profile?.email && nextStatus === "viewed") {
      const who = proposal.client_name || "Your client";
      void sendOwnerNotice({
        to: profile.email,
        subject: `${who} opened "${proposal.title}"`,
        title: "Your proposal was just opened",
        lines: [
          `${who} opened "${proposal.title}". This is a good moment to follow up while it's fresh.`,
          "You'll get another email as soon as they sign.",
        ],
        linkUrl: `${appUrl()}/editor/${proposal.id}`,
        linkLabel: "Open the proposal",
      }).catch((err) => console.error("Failed to send viewed notice", err));
    }
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
      isOwnerPreview={isOwner}
      contactEmail={profile?.email ?? null}
    />
  );
}
