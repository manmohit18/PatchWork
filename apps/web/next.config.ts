import type { NextConfig } from "next";

const apiOrigin = process.env.API_INTERNAL_ORIGIN ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiOrigin}/api/:path*` },
      { source: "/auth/:path*", destination: `${apiOrigin}/auth/:path*` },
    ];
  },
};

export default nextConfig;
