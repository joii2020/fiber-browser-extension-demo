# Why Safari Extensions Cannot Run fiber-js Directly

The reason is similar to Firefox: `fiber-js` currently requires `SharedArrayBuffer` and `Atomics` for communication between workers, while `SharedArrayBuffer` requires the page to be `crossOriginIsolated=true`.

This demo only writes the following manifest fields for the Chrome target:

```json
{
  "cross_origin_embedder_policy": { "value": "require-corp" },
  "cross_origin_opener_policy": { "value": "same-origin" }
}
```

Safari Web Extensions use a manifest format close to Chrome and Firefox, but Safari is not the Chrome extension runtime. This demo does not have a reliable manifest configuration path that makes a Safari extension popup cross-origin isolated, so a usable `SharedArrayBuffer` is typically not exposed inside the Safari popup.

That means the preconditions for `fiber.start()` are not met:

```text
crossOriginIsolated=false
SharedArrayBuffer=false
```

CSP, permission declarations, and packaging the output as a Safari app extension do not solve this shared-memory requirement. Supporting Safari requires either a no-SAB path in `fiber-js`, or moving the Fiber core into a COOP/COEP-enabled web page or local helper process.
