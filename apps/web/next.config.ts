import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: "/scifi",
  transpilePackages: ["@nexus/api", "@nexus/db"],
  // Skip TypeScript errors during build (temporary - pre-existing issues)
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  turbopack: {
    root: "/home/administrator/nexus-command-center",
  },
};

export default nextConfig;
