import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.100.118",
    "192.168.56.1",
    "192.168.100.118:3000",
    "192.168.100.118:3001",
    "192.168.56.1:3000",
    "192.168.56.1:3001"
  ]
};

export default nextConfig;
