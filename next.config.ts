import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for catching bugs early
  reactStrictMode: true,

  // PWA & image optimization
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      { protocol: "https", hostname: "graph.facebook.com" },
    ],
  },

  // Reduce bundle size by excluding server-only packages from client
  serverExternalPackages: [],

  // Security: remove powered-by header
  poweredByHeader: false,

  // Compiler optimizations
  compiler: {},

  // Redirect legacy paths
  async redirects() {
    return [
      {
        source: "/app",
        destination: "/dashboard",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
