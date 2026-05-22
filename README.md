# Fiber WASM Extension Demo

Minimal browser extension demo for checking whether `@nervosnetwork/fiber-js`
can load and complete `fiber.start()` inside a Chrome Offscreen Document.

The popup shows the offscreen Fiber runtime status and allows connecting a peer.
It does not open channels, close channels, pay invoices, inject content scripts,
or support normal web pages.

## Scope

This demo answers one question: can the current `fiber-js` browser bundle start
inside a hidden Chrome extension document when the extension origin is
cross-origin isolated?

The runtime flow is:

```text
popup -> background service worker -> offscreen document -> fiber.start()
```

The expected successful result is:

```text
Success
```

That means the offscreen document had the required browser primitives, loaded
the packaged WASM assets, created the `fiber-js` workers, and completed
`fiber.start()`.

## Requirements

- Chrome 109+ or another Chromium-based browser with Manifest V3 and Offscreen
  Document support.
- `pnpm`.

The demo uses the published npm package:

- `@nervosnetwork/fiber-js`

The build copies `@nervosnetwork/fiber-js/dist/index.js` into the extension as
`vendor/fiber-js.js`, then copies the `.wasm` files referenced by that published
bundle. If the installed npm package references WASM files that are not included
in the package, the build prints the missing filenames and continues. Runtime
WASM loading may still fail unless the package inlines those assets or a later
release includes them. To make missing npm package WASM assets fail the build,
run `FIBER_JS_REQUIRE_WASM_ASSETS=true pnpm build`.

## Build

```bash
pnpm install
pnpm build
```

Build output is written to `dist/chrome-mv3`.

## Load

Chrome / Chromium is the supported runtime target for this demo. WXT generates
the extension manifest and opts extension pages into COOP/COEP so `fiber-js` can
use `SharedArrayBuffer` inside the offscreen document.

To load the demo:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `dist/chrome-mv3`.
5. Open the Fiber WASM Demo extension popup.
6. Click Start.

The popup should show `Starting offscreen Fiber runtime...` while
`fiber.start()` is running and `Success` after startup completes.

## Runtime Notes

The popup asks the background service worker to create `offscreen.html`, then
the offscreen document owns the `Fiber` instance and runs `fiber.start()`.

The demo persists one generated Fiber key in offscreen document `localStorage`
under `fiber-extension-demo:fiber-key`. It also uses `/fiber-extension-demo` as
the database prefix passed to `fiber.start()`. Reinstalling the extension or
clearing extension site data resets this local demo state.

The extension requests host access to `https://testnet.ckbapp.dev/*` because the
embedded Fiber config points the CKB RPC URL at that endpoint.

The extension also requests the `offscreen` permission. The offscreen document is
created with `BLOBS`, `WORKERS`, and `LOCAL_STORAGE` reasons because the current
`fiber-js` bundle creates blob-backed workers and the demo stores one generated
key locally.

## Troubleshooting

If the popup reports that `chrome.offscreen` is unavailable, use Chrome 109+ or
another Chromium runtime that supports Manifest V3 Offscreen Documents.

If the popup reports a `SharedArrayBuffer` or `crossOriginIsolated` error, the
offscreen extension document is not cross-origin isolated. Confirm that you
loaded the `dist/chrome-mv3` output in Chrome or Chromium, not Firefox or Safari.

If the popup reports a worker or `blob` error, check the browser extension
console for Content Security Policy messages. The current `fiber-js` bundle
creates workers from generated JavaScript blobs, so CSP behavior is an important
part of this demo.

If the popup reports a WASM error, confirm that the two copied `.wasm` files are
present in `dist/chrome-mv3` and that the installed `@nervosnetwork/fiber-js`
npm package includes the WASM files referenced by its browser bundle.

## Browser Support

Chrome / Chromium is the only supported runtime target for this demo.

Firefox and Safari extension pages generally cannot satisfy the
`crossOriginIsolated=true` and `SharedArrayBuffer` requirements used by the
current `fiber-js` implementation. See:

- `docs/firefox-fiber-js-extension-report.md`
- `docs/safari-fiber-js-extension-report.md`
