import { createMDX } from 'fumadocs-mdx/next';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker deployment
  reactStrictMode: true,
  // Handle problematic packages
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@graphql-mesh/**',
      'node_modules/@railgun-community/**',
      'node_modules/graphql/**',
    ],
  },
  // Skip file tracing for these packages entirely
  outputFileTracingIncludes: {
    '/api/**': [],
  },
  typescript: {
    // Ignore type errors in node_modules (caused by TypeScript 5.9 Buffer type changes)
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
      },
      {
        protocol: 'https',
        hostname: '**.coingecko.com',
      },
    ],
  },
  serverExternalPackages: [
    'lokijs',
    'encoding',
    '@railgun-community/wallet',
    '@railgun-community/shared-models',
    '@graphql-mesh/runtime',
    '@graphql-mesh/utils',
    'graphql',
  ],
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js modules used by snarkjs in browser environment
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      readline: false,
      crypto: require.resolve('crypto-browserify'),
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify/browser'),
      stream: require.resolve('stream-browserify'),
      constants: false,
    };

    // Handle React Native and optional dependencies that aren't needed in web
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };

    // Ignore critical dependency warnings from specific packages
    config.ignoreWarnings = [
      { module: /@graphql-tools\/url-loader/ },
      { module: /web-worker/ },
      { module: /ffjavascript/ },
      { module: /fumadocs-mdx/ },
    ];

    return config;
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
