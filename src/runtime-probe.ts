export function assertRuntimeSupport(): void {
  if (window.isSecureContext !== true) {
    throw new Error("Failed: extension popup is not running in a secure context.");
  }
  if (window.crossOriginIsolated !== true) {
    throw new Error("Failed: window.crossOriginIsolated is false.");
  }
  if (typeof SharedArrayBuffer !== "function") {
    throw new Error("Failed: SharedArrayBuffer is unavailable.");
  }
  if (typeof Worker !== "function") {
    throw new Error("Failed: Worker is unavailable.");
  }
  if (typeof indexedDB === "undefined") {
    throw new Error("Failed: indexedDB is unavailable.");
  }
}
