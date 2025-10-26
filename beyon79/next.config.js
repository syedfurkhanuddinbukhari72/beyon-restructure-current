/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use export output for static HTML generation instead of standalone
  output: 'export',
  // Do not emit production browser source maps (avoid shipping original sources)
  productionBrowserSourceMaps: false,
  // Removed static export options for dev server
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true
  },
  // Electron-specific optimizations
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : '',
  // Webpack configuration for Electron compatibility
  webpack: (config, { isServer }) => {

    // Handle node modules that might cause issues in Electron
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      process: require.resolve('process/browser'),
    };

    // Ensure `global` and `process` are defined in browser bundles
    const webpack = require('webpack');
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.ProvidePlugin({
        global: 'globalThis',
        process: 'process/browser',
      })
    );

    return config;
  },
}

module.exports = nextConfig
