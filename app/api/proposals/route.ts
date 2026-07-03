import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { canCreateProposal } from "@/lib/plan";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const allowed = await canCreateProposal(
    supabase,
    user.id,
    profile?.plan ?? "free"
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Proposal limit reached for your plan" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("proposals")
    .insert({
      user_id: user.id,
      title: body.title ?? "Untitled proposal",
      client_name: body.client_name ?? null,
      client_email: body.client_email ?? null,
      content: body.content ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposal: data }, { status: 201 });
}
