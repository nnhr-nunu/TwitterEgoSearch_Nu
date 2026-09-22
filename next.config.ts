import type { NextConfig } from "next";

const fromEnv = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
const basePath =
  fromEnv ||
  (process.env.GITHUB_ACTIONS === "true" ? "/TwitterEgoSearch_Nu" : "");

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  agentRules: false,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
