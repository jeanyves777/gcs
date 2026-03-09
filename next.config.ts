import type { NextConfig } from "next";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://js.stripe.com https://accounts.google.com https://apis.google.com;
  style-src 'self' 'unsafe-inline' https://accounts.google.com;
  img-src 'self' data: blob: https://*.gravatar.com https://*.githubusercontent.com https://*.stripe.com;
  font-src 'self' data:;
  connect-src 'self' https://api.stripe.com https://accounts.google.com https://www.googleapis.com https://oauth2.googleapis.com;
  frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy.replace(/\s{2,}/g, " ").trim(),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.gravatar.com" },
      { protocol: "https", hostname: "**.githubusercontent.com" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs", "ssh2"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
