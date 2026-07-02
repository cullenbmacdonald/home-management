import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // allow larger manual/PDF uploads
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
