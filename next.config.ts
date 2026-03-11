import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
