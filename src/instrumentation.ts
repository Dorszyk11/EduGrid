/**
 * Next.js Instrumentation — runs once when the server starts,
 * BEFORE any route handler or middleware is evaluated.
 *
 * Payload CMS's `deepCopyObject` utility calls `value instanceof File`
 * which throws ReferenceError in Node.js because the browser `File`
 * global does not exist on the server.
 *
 * We polyfill it here so the `instanceof` check simply returns false
 * for any regular object.
 */
export async function register() {
  if (typeof globalThis.File === 'undefined') {
    // Minimal File polyfill — only needs to exist so that `instanceof File`
    // doesn't throw. No actual File behaviour is required on the server.
    globalThis.File = class File extends Blob {
      name: string
      lastModified: number

      constructor(
        parts: BlobPart[],
        name: string,
        options?: FilePropertyBag,
      ) {
        super(parts, options)
        this.name = name
        this.lastModified = options?.lastModified ?? Date.now()
      }
    } as typeof globalThis.File
  }
}
