import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: "/scifi",
  transpilePackages: ["@nexus/api", "@nexus/db"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
