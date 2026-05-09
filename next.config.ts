import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/projects/:id/faces/:face",
        destination: "/api/project-faces/:id/:face"
      }
    ];
  },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
