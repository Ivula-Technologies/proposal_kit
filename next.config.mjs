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
};

export default nextConfig;
