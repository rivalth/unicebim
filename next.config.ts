import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Allow images from same origin, data URIs, blob URIs, and Supabase Storage
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  // Next.js and CSS-in-JS/font pipelines can rely on inline styles.
  "style-src 'self' 'unsafe-inline'",
  // Dev tooling may rely on eval; keep it disabled in production.
  // Next.js Turbopack requires 'unsafe-inline' for inline scripts in dev mode
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  // Supabase (Auth + PostgREST) runs over HTTPS/WSS.
  // Sentry error tracking (only when DSN is configured)
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "unavatar.io",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Configure Server Actions body size limit (default: 1MB, increase to 5MB for avatar uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

// Wrap Next.js config with Sentry if DSN is configured
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Sentry options
      silent: true, // Suppresses source map uploading logs during build
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Only upload source maps in production builds
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      sourcemaps: {
        disable: true,
      },
      // Webpack options (moved from deprecated top-level options)
      webpack: {
        treeshake: {
          removeDebugLogging: true,
        },
        automaticVercelMonitors: true,
      },
    })
  : nextConfig;