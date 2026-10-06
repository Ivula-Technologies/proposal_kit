import { redirect } from "next/navigation";

// Kept so old links keep working; plans now live in Settings.
export default function UpgradePage() {
  redirect("/settings#billing");
}
