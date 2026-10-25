import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { loadEntitlement, UPGRADE_REQUIRED } from "@/lib/billing";
import { builtInTemplate } from "@/lib/templates";
import { isUuid } from "@/lib/validate";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Proposal query failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ proposals: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { entitlement } = await loadEntitlement(service, user.id);
  if (!entitlement.canCreate) {
    return NextResponse.json(
      {
        error:
          entitlement.state === "active"
            ? "You've used this month's proposals on your plan"
            : "Your free trial has ended",
        code: UPGRADE_REQUIRED,
      },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  let title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : "Untitled proposal";
  let content =
    body.content && typeof body.content === "object" ? body.content : null;
  let depositAmount: number | null = null;

  const template = builtInTemplate(body.template);
  if (template) {
    title = template.name;
    content = template.content;
  }

  if (isUuid(body.duplicateOf)) {
    // Start a new proposal from one of your own, for the next client.
    const { data: source } = await service
      .from("proposals")
      .select("title, content, deposit_amount")
      .eq("id", body.duplicateOf)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!source) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    title = `${source.title} (copy)`.slice(0, 200);
    content = source.content;
    depositAmount = source.deposit_amount;
  }

  const { data, error } = await service
    .from("proposals")
    .insert({ user_id: user.id, title, content, deposit_amount: depositAmount })
    .select("*")
    .single();

  if (error) {
    console.error("Proposal query failed", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ proposal: data }, { status: 201 });
}
