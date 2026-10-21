import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const description =
  "Send a proposal your client can sign on their phone and pay the deposit in one link. Templates, e-signatures and Stripe deposits for US freelancers. 14-day free trial.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "ProposalKit: proposals, e-signatures and deposits for freelancers",
  description,
  openGraph: {
    title: "ProposalKit: get proposals signed and deposits paid in one link",
    description,
    siteName: "ProposalKit",
    type: "website",
  },
  twitter: { card: "summary", title: "ProposalKit", description },
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
