import type { MetadataRoute } from "next";

// Lets freelancers add ProposalKit to their home screen and open it full
// screen, straight into the dashboard.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "ProposalKit",
    short_name: "ProposalKit",
    description: "Send proposals your clients can sign and pay from their phone.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8FAFC",
    theme_color: "#0F1A3E",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dashboard", url: "/dashboard" },
      { name: "Settings", url: "/settings" },
    ],
  };
}
