import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim();

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  agentRules: false,
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
