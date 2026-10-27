/**
 * Sengaja .mjs, bukan .ts: Next 15.5+ memuat config lewat TypeScript loader,
 * sementara image produksi menjalankan `npm prune --production` sehingga
 * `typescript` tidak ada saat runtime dan container gagal start.
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ['localhost', '127.0.0.1', '*.lvh.me'],
  async rewrites() {
    const backendUrl = process.env.GRAPHQL_URL?.replace('/graphql', '') || 'http://nginx-server:80';
    return [
      {
        source: '/graphql',
        destination: process.env.GRAPHQL_URL || 'http://nginx-server:80/graphql',
      },
      {
        source: '/api/chat/:path*',
        destination: `${backendUrl}/api/chat/:path*`,
      },
      {
        source: '/api/wwebjs/proxy',
        destination: process.env.WWEBJS_URL ? `${process.env.WWEBJS_URL}/` : 'http://127.0.0.1:3000/',
      },
      {
        source: '/api/wwebjs/:path*',
        destination: process.env.WWEBJS_URL ? `${process.env.WWEBJS_URL}/:path*` : 'http://127.0.0.1:3000/:path*',
      },
    ];
  },
};

export default nextConfig;
