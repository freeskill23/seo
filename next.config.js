/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  output: "export",
  trailingSlash: true,
  ...(isGithubActions
    ? {
        basePath: "/seo",
        assetPrefix: "/seo/",
      }
    : {}),
};

module.exports = nextConfig;
