import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default:
      "ProposalKit — Proposals, contracts & e-signatures for freelancers",
    template: "%s — ProposalKit",
  },
  description:
    "Create professional proposals, attach contracts, collect e-signatures, and receive a deposit — all in one shareable link.",
  openGraph: {
    title: "ProposalKit",
    description:
      "Proposals, contracts, and e-signatures — in one link. The only tool that collects a deposit the moment your client signs.",
    siteName: "ProposalKit",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ProposalKit",
    description:
      "Proposals, contracts, and e-signatures — in one link.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
