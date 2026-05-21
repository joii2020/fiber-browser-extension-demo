# Why Firefox Extensions Cannot Run fiber-js Directly

The current browser implementation of `fiber-js` depends on `SharedArrayBuffer` for sharing memory between workers, and uses `Atomics` for synchronization. This is not an optional optimization; it is required for `fiber.start()`.

The web platform only exposes `SharedArrayBuffer` in a secure context where `crossOriginIsolated=true`. Chrome extensions can opt into this state with the `cross_origin_embedder_policy` and `cross_origin_opener_policy` manifest fields, so this demo only writes those fields for the Chrome target.

Normal Firefox WebExtension pages currently cannot enable cross-origin isolation in the same way. Mozilla tracks the relevant work here:

- https://bugzilla.mozilla.org/show_bug.cgi?id=1673477
- https://bugzilla.mozilla.org/show_bug.cgi?id=1750654

As a result, a Firefox popup/options/extension page usually reports:

```text
crossOriginIsolated=false
SharedArrayBuffer=false
```

CSP, `host_permissions`, `browser_specific_settings.gecko.id`, and switching between Manifest V2/V3 do not replace COOP/COEP. Supporting Firefox requires either a `fiber-js` implementation that does not depend on `SharedArrayBuffer`, or moving the Fiber core into a COOP/COEP-enabled web page or local helper process.
