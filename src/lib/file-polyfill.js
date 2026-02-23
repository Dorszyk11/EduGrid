// Webpack helper: re-exports the Node.js 20+ native File global
// so that ProvidePlugin can inject it into bundled server modules.
module.exports = typeof globalThis.File !== 'undefined'
  ? globalThis.File
  : class File extends Blob {
      constructor(parts, name, options) {
        super(parts, options)
        this.name = name
        this.lastModified = (options && options.lastModified) || Date.now()
      }
    }
