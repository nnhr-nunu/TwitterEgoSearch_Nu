import type { NextConfig } from "next";

// 公開先は独自ドメイン（self-search.oshilog.life）直下なので、既定ではサブパスを付けない。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  agentRules: false,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
