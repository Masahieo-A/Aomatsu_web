/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // モノレポの共有パッケージ（TypeScriptソース）をトランスパイルする
  transpilePackages: ["@zdp/schema", "@zdp/prompts"],
};

module.exports = nextConfig;
