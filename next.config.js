/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "framerusercontent.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["react", "react-dom", "swr"],
  },
};

module.exports = nextConfig
