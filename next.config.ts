import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/graphql',
        destination: process.env.GRAPHQL_URL || 'http://nginx-server:80/graphql',
      },
      {
        source: '/api/wwebjs/:path*',
        destination: process.env.WWEBJS_URL ? `${process.env.WWEBJS_URL}/:path*` : 'http://127.0.0.1:3001/:path*',
      },
    ];
  },
};

export default nextConfig;
