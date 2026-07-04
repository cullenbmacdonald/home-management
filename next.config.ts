import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg"],
  experimental: {
    serverActions: {
      // allow larger manual/PDF uploads
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
