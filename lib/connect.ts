import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Copy a connected account's readiness flags onto the owner's profile. */
export async function syncConnectedAccount(
  supabase: SupabaseClient,
  account: Stripe.Account
) {
  await supabase
    .from("profiles")
    .update({
      charges_enabled: !!account.charges_enabled,
      payouts_enabled: !!account.payouts_enabled,
    })
    .eq("stripe_account_id", account.id);
}
