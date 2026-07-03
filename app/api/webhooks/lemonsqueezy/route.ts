import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/server";
import { resolvePlanFromProductName } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";

interface LemonSqueezyWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: Record<string, unknown>;
  };
  data: {
    attributes: {
      user_email?: string;
      product_name?: string;
      variant_name?: string;
      status?: string;
    };
  };
}

function isValidSignature(rawBody: string, signature: string | null) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as LemonSqueezyWebhookPayload;
  const { event_name } = payload.meta;
  const { user_email, product_name, variant_name } = payload.data.attributes;

  if (!user_email) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceClient();

  if (event_name === "subscription_created" || event_name === "subscription_updated") {
    const plan = resolvePlanFromProductName(product_name ?? variant_name);
    if (plan) {
      await supabase.from("profiles").update({ plan }).eq("email", user_email);
    }
  }

  if (event_name === "subscription_cancelled" || event_name === "subscription_expired") {
    await supabase.from("profiles").update({ plan: "free" }).eq("email", user_email);
  }

  return NextResponse.json({ ok: true });
}
