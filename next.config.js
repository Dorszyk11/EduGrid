const path = require('path')
const webpack = require('webpack')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['payload'],
  serverExternalPackages: [
    'drizzle-kit',
    'esbuild',
    '@libsql/client',
    'libsql',
    '@payloadcms/db-postgres',
    '@payloadcms/drizzle',
    'pg',
    'pg-native',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins.push(
        new webpack.ProvidePlugin({
          File: path.resolve(__dirname, 'src/lib/file-polyfill.js'),
        })
      )

      config.resolve.fallback = {
        ...config.resolve.fallback,
        'cli-color': false,
      }
    }

    config.module.rules.push({
      test: /\.(txt|md|LICENSE)$/i,
      type: 'asset/source',
    })

    return config
  },
}

module.exports = nextConfig
