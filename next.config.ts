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
    ];
  },
};

export default nextConfig;
