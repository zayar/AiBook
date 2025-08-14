import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:3000/api/v1/:path*'
      },
      {
        source: '/health',
        destination: 'http://localhost:3000/health'
      }
    ];
  },
  // Increase API timeout for long-running AI requests
  experimental: {
    proxyTimeout: 120000 // 2 minutes
  }
};

export default nextConfig;
