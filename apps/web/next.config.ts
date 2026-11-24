import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@cryptiq/design-tokens', '@cryptiq/types', '@cryptiq/api-client'],
  reactStrictMode: true,
};

export default nextConfig;
