import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

try {
  initOpenNextCloudflareForDev();
} catch {
  // AI Studio veya Cloudflare dışı ortamlarda sessizce geç
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ["**.run.app", "**.google.com", "**.googleusercontent.com"],
  outputFileTracingIncludes: {
    "/*": ["./migrations/**/*"],
  },
};

export default nextConfig;
