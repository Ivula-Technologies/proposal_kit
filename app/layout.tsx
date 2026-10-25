import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorker } from "@/components/shared/ServiceWorker";

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
  applicationName: "ProposalKit",
  appleWebApp: { capable: true, title: "ProposalKit", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F1A3E",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <ServiceWorker />
      </body>
    </html>
  );
}
