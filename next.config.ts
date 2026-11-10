import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'sqlite3'];
    }
    return config;
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/.well-known/oauth-protected-resource',
          destination: '/api/oauth/metadata/protected-resource',
        },
        {
          source: '/.well-known/oauth-protected-resource/:path*',
          destination: '/api/oauth/metadata/protected-resource/:path*',
        },
        {
          source: '/.well-known/oauth-authorization-server',
          destination: '/api/oauth/metadata/authorization-server',
        },
      ],
    };
  },
};

export default nextConfig;
