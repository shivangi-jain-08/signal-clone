import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // local dev
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      // production — allow any https host so the backend URL is configurable
      {
        protocol: "https",
        hostname: "**",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
