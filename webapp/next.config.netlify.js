/** @type {import('next').NextConfig} */

/**
 * Next.js Configuration for Netlify Static Export
 * 
 * This configuration enables static site generation for deployment to Netlify.
 * To use this config:
 * 1. Rename next.config.js to next.config.server.js
 * 2. Rename this file to next.config.js
 * 3. Run: npm run build
 * 4. Deploy the 'out' folder to Netlify
 */

const nextConfig = {
  // Enable static export
  output: 'export',
  
  // Output directory for static files
  distDir: 'out',
  
  // Disable image optimization (not supported in static export)
  images: {
    unoptimized: true,
  },
  
  // Environment variables for client-side
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://yourinst-api.onrender.com',
  },
  
  // Strict mode for better debugging
  reactStrictMode: true,
  
  // Disable server-side features
  // Note: API routes won't work in static export
  // All API calls should go to the Render backend
  
  // Webpack configuration for client-side only
  webpack: (config, { isServer }) => {
    // Fallbacks for Node.js modules (not needed in browser)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
    };
    
    return config;
  },
  
  // Trailing slash for better static hosting
  trailingSlash: true,
  
  // Base path (if deploying to subdirectory)
  // basePath: '',
  
  // Asset prefix (for CDN)
  // assetPrefix: '',
};

module.exports = nextConfig;
