const path = require('path')
const webpack = require('webpack')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['payload'],
  turbopack: {},
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
  async headers() {
    // Nagłówki bezpieczeństwa dla całej aplikacji (defense-in-depth).
    // Świadomie BEZ pełnego CSP script/style (zerwałby Next/Payload) — tylko frame-ancestors.
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
    ]
    return [{ source: '/:path*', headers: securityHeaders }]
  },
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
