/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "groq-sdk", "winston"],
  },
  // Allow importing from the engine src directory
  transpilePackages: [],
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
    };
    // Allow resolving modules from root node_modules (for engine imports)
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, "../node_modules"),
    ];
    // Resolve @prisma/client from the root node_modules so it finds the generated client
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@prisma/client": path.resolve(__dirname, "../node_modules/@prisma/client"),
      };
      config.externals = [...(config.externals || []), "better-sqlite3"];
    }
    return config;
  },
};

module.exports = nextConfig;
