/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  allowedDevOrigins: ["**.run.app", "**.google.com", "**.googleusercontent.com"],
  outputFileTracingIncludes: {
    "/*": ["./migrations/**/*"],
  },
};

export default nextConfig;
