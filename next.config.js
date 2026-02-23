const path = require('path')
const webpack = require('webpack')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['payload'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Payload's deepCopyObject.js uses `instanceof File` which throws
      // ReferenceError inside webpack's module scope (even though Node 20
      // has File as a global). ProvidePlugin injects a reference so that
      // every `File` identifier in bundled code resolves to the real class.
      config.plugins.push(
        new webpack.ProvidePlugin({
          File: path.resolve(__dirname, 'src/lib/file-polyfill.js'),
        })
      )

      // Fallback for optional cli-color dependency used by json-schema-to-typescript
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'cli-color': false,
      }
    }
    return config
  },
}

module.exports = nextConfig
