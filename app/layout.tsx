import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "ProposalKit — Proposals, contracts & e-signatures for freelancers",
  description:
    "Create professional proposals, attach contracts, collect e-signatures, and receive a deposit — all in one shareable link.",
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
