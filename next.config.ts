import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
  ],
  devIndicators: false,
};

export default nextConfig;
