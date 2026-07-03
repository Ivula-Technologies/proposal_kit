import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { EditorClient } from "./EditorClient";

export default async function EditorPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!proposal) notFound();

  return <EditorClient proposal={proposal} />;
}
