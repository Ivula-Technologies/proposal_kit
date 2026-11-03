import Link from "next/link";

// Shared shell for the Privacy and Delete your account pages.
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm font-semibold text-brand-navy hover:underline">
        ProposalKit
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-brand-navy">{title}</h1>
      <p className="mt-1 text-sm text-neutral-muted">Last updated {updated}</p>
      <div className="prose prose-sm mt-8 max-w-none prose-a:text-brand-navy">{children}</div>
    </main>
  );
}
