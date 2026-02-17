/** @type {import('next').NextConfig} */
const path = require("path");

/** Packages that must NOT be bundled by webpack (native / platform binaries) */
const ENGINE_EXTERNALS = [
  "better-sqlite3",
  "ffmpeg-static",
  "@ffprobe-installer/ffprobe",
  "typescript",
  "source-map-support",
  "esbuild",
];

/** Regex: any @remotion/* package import */
const REMOTION_RE = /^@remotion\//;

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      ...ENGINE_EXTERNALS,
      "@remotion/renderer",
      "@remotion/bundler",
      "@remotion/cli",
      "groq-sdk",
      "winston",
      "edge-tts",
    ],
  },
  transpilePackages: [],
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
    };
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, "../node_modules"),
    ];
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@prisma/client": path.resolve(
          __dirname,
          "../node_modules/@prisma/client"
        ),
      };
      // Function-based externals to catch all @remotion/* sub-paths
      const prevExternals = config.externals || [];
      config.externals = [
        ...prevExternals,
        ...ENGINE_EXTERNALS,
        function ({ request }, callback) {
          if (REMOTION_RE.test(request)) {
            return callback(null, "commonjs " + request);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
