import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '4mb' }, // large site-list pastes
  },
};

export default nextConfig;
