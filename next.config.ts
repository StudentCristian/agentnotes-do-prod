import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@boundaryml/baml",
    "@boundaryml/baml-linux-x64-gnu",
    "ffmpeg-static",
    "fluent-ffmpeg",
  ],
};

export default nextConfig;
