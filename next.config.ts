import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.*.*.*'], // any IPv4 host (LAN access to the dev server); dev-only, ignored in production
  experimental: {
    serverActions: { bodySizeLimit: '4mb' }, // large site-list pastes
  },
};

export default nextConfig;
