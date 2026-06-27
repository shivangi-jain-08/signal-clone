import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images: allow same-origin avatar URLs served by the backend
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
