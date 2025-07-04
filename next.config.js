/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: { unoptimized: true },
  // Disable webpack cache and add timeout
  webpack: (config, { dev, isServer }) => {
    // Disable cache completely
    config.cache = false;
    
    // Add timeout for builds
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        // Re-enabled minification for production optimization
        minimize: true,
      };
    }
    
    return config;
  },
  // Add experimental features to help with build issues
  experimental: {
    forceSwcTransforms: true,
  },
  // Increase build timeout
  staticPageGenerationTimeout: 60,
};

module.exports = nextConfig;
