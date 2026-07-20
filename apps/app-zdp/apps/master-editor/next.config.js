/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@zdp/schema", "@zdp/prompts"],
};

module.exports = nextConfig;
