import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { loadEntitlement, UPGRADE_REQUIRED } from "@/lib/billing";

export async function GET() {
  const supabase = createClient();
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposals: data });
}

export async function POST(request: Request) {
  const supabase = createClient();
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
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : "Untitled proposal";
  const content =
    body.content && typeof body.content === "object" ? body.content : null;

  const { data, error } = await service
    .from("proposals")
    .insert({ user_id: user.id, title, content })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposal: data }, { status: 201 });
}
