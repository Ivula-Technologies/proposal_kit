import { createClient, createServiceClient } from "@/lib/supabase/server";
import { loadEntitlement, PLANS } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";
import { syncConnectedAccount } from "@/lib/connect";
import { toTier } from "@/components/shared/PricingCard";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage(props: {
  searchParams: Promise<{ payouts?: string; billing?: string }>;
}) {
  const searchParams = await props.searchParams;
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();

  const service = createServiceClient();
  let { profile, entitlement } = await loadEntitlement(service, user!.id);

  // Coming back from Stripe onboarding: refresh the account status right
  // away instead of waiting for the account.updated webhook.
  if (profile?.stripe_account_id && !profile.charges_enabled) {
    try {
      const account = await getStripe().accounts.retrieve(profile.stripe_account_id);
      await syncConnectedAccount(service, account);
      ({ profile, entitlement } = await loadEntitlement(service, user!.id));
    } catch (err) {
      console.error("Couldn't refresh Stripe account", err);
    }
  }

  return (
    <SettingsClient
      profile={{
        full_name: profile?.full_name ?? "",
        business_name: profile?.business_name ?? "",
        email: profile?.email ?? user!.email ?? "",
        hasPayoutAccount: !!profile?.stripe_account_id,
        chargesEnabled: !!profile?.charges_enabled,
        hasBillingAccount: !!profile?.stripe_customer_id,
        subscriptionStatus: profile?.subscription_status ?? null,
        currentPeriodEnd: profile?.current_period_end ?? null,
      }}
      entitlement={entitlement}
      plans={Object.values(PLANS).map((plan) => ({
        tier: toTier(plan),
        available: !!plan.priceId,
      }))}
      notice={
        searchParams.billing === "success"
          ? "Thanks! Your plan is active. It can take a few seconds to show here."
          : searchParams.payouts === "return" && !profile?.charges_enabled
            ? "Stripe is still reviewing your details. Finish any remaining steps to start taking deposits."
            : null
      }
    />
  );
}
