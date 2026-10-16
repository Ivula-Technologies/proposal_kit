import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { loadEntitlement, UPGRADE_REQUIRED } from "@/lib/billing";
import {
  isEmail,
  isUuid,
  MAX_DEPOSIT_CENTS,
  MIN_DEPOSIT_CENTS,
} from "@/lib/validate";

type Updates = Record<string, unknown>;

function parseUpdates(body: Record<string, unknown>): Updates | string {
  const updates: Updates = {};

  if ("title" in body) {
    if (typeof body.title !== "string") return "Invalid title";
    updates.title = body.title.trim().slice(0, 200) || "Untitled proposal";
  }
  for (const key of ["client_name", "client_email"] as const) {
    if (key in body) {
      const value = body[key];
      if (value === null || value === "") {
        updates[key] = null;
      } else if (typeof value === "string") {
        updates[key] = value.trim().slice(0, 200);
      } else {
        return `Invalid ${key}`;
      }
    }
  }
  if (updates.client_email && !isEmail(updates.client_email)) {
    return "Enter a valid client email";
  }
  if ("content" in body) {
    if (body.content !== null && typeof body.content !== "object") {
      return "Invalid content";
    }
    updates.content = body.content;
  }
  if ("deposit_amount" in body) {
    const value = body.deposit_amount;
    if (value === null || value === 0) {
      updates.deposit_amount = null;
    } else if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= MIN_DEPOSIT_CENTS &&
      value <= MAX_DEPOSIT_CENTS
    ) {
      updates.deposit_amount = value;
    } else {
      return "Deposit must be between $0.50 and $100,000";
    }
  }
  if ("status" in body) {
    // Owners can only mark a draft as sent; viewed/signed are set by the
    // public page and the signing route.
    if (body.status !== "sent") return "Invalid status";
    updates.status = "sent";
  }
  return updates;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const updates = parseUpdates(body);
  if (typeof updates === "string") {
    return NextResponse.json({ error: updates }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: existing } = await service
    .from("proposals")
    .select("id, status")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === "signed") {
    return NextResponse.json(
      { error: "Signed proposals can't be changed" },
      { status: 409 }
    );
  }

  const { profile, entitlement } = await loadEntitlement(service, user.id);
  if (!entitlement.canEdit) {
    return NextResponse.json(
      { error: "Your free trial has ended", code: UPGRADE_REQUIRED },
      { status: 403 }
    );
  }
  if (updates.deposit_amount && !profile?.charges_enabled) {
    return NextResponse.json(
      { error: "Set up payouts in Settings before asking for a deposit" },
      { status: 400 }
    );
  }
  if (updates.status === "sent" && existing.status !== "draft") {
    delete updates.status;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ proposal: existing });
  }

  const { data, error } = await service
    .from("proposals")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .neq("status", "signed")
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Signed proposals can't be changed" },
      { status: 409 }
    );
  }

  return NextResponse.json({ proposal: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("proposals")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
