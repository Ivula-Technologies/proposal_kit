/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server build for cPanel "Setup Node.js App" (see DEPLOY.md).
  output: "standalone",
  // Keep Chromium out of the webpack bundle and ship its compressed binary
  // with the standalone server so signed PDFs work on cPanel.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "@tiptap/html", "happy-dom"],
  outputFileTracingIncludes: {
    "/api/sign": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  // Phones must pick up a new service worker on the next visit.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
