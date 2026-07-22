import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    ".space-z.ai",
    ".trycloudflare.com",
    ".blogspot.com",
    ".vercel.app",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Security: Restrict iframe embedding to trusted domains only
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https: ws: wss:",
              "media-src 'self' blob:",
              "frame-ancestors 'self' *.blogspot.com *.google.com *.vercel.app *.space-z.ai *.trycloudflare.com localhost:* 127.0.0.1:*",
            ].join("; "),
          },
          // CORS: needed for iframe cross-origin cookie auth
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Allow camera for face recognition, block microphone
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
