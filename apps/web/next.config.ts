import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // Serve AVIF first (Chrome 85+, Firefox 93+, Safari 16+) with WebP
    // as fallback — both are 30-50% smaller than the source PNG/JPG.
    // Browsers without AVIF/WebP will still get the original.
    formats: ["image/avif", "image/webp"],
    // Keep optimized variants in the CDN/edge cache for a week instead
    // of the 60-second default, since the underlying public/ files are
    // versioned through the build.
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  experimental: {
    // Work around occasional Turbopack persistence issues on Windows
    // (e.g. SST write failures / corrupted task DB under `.next/`).
    turbopackFileSystemCacheForDev: false,
  },
  // Legacy admin URLs were consolidated under /admin/* (Phase 3 of the
  // admin-hub rebuild). Keep the old paths working for anyone with a
  // bookmark so they land on the canonical URL after auth.
  async redirects() {
    return [
      {
        source: "/rq-dashboard",
        destination: "/admin/rq-responses",
        permanent: true,
      },
      {
        source: "/rq-dashboard/:path*",
        destination: "/admin/rq-responses/:path*",
        permanent: true,
      },
      {
        source: "/design-tasks",
        destination: "/admin/design-tasks",
        permanent: true,
      },
      {
        source: "/design-tasks/:path*",
        destination: "/admin/design-tasks/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

