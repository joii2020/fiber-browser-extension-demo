# Fiber WASM Extension Demo

Minimal browser extension demo for checking whether `@nervosnetwork/fiber-js`
can load and complete `fiber.start()` inside extension popup pages.

Phase 1 intentionally contains only a `Start` button and a text output area.
It does not connect peers, open channels, close channels, pay invoices, inject
content scripts, or support normal web pages.

## Scope

This demo answers one question: can the current `fiber-js` browser bundle start
inside a Chrome extension popup when the extension page is cross-origin
isolated?

The expected successful result is:

```text
Success
```

That means the popup had the required browser primitives, loaded the packaged
WASM assets, created the `fiber-js` workers, and completed `fiber.start()`.

## Requirements

- Chrome or another Chromium-based browser with Manifest V3 extension support.
- `pnpm`.
- A sibling checkout of the Fiber repository at `../fiber`.

The build copies these files from the sibling checkout:

- `../fiber/fiber-js/dist/index.js`
- `../fiber/crates/fiber-wasm/dist/27ea9610449860a700f7.wasm`
- `../fiber/crates/fiber-wasm-db-worker/dist/ce0d9f4142d556152245.wasm`

If those files are missing, build the Fiber WASM/browser artifacts first, then
rerun this demo build.

## Build

```bash
pnpm install
pnpm build
```

Build output is written to `dist/chrome-mv3`.

## Load

Chrome / Chromium is the supported runtime target for this demo. WXT generates
the extension manifest and opts extension pages into COOP/COEP so `fiber-js` can use
`SharedArrayBuffer` inside the popup.

To load the demo:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `dist/chrome-mv3`.
5. Open the Fiber WASM Demo extension popup.
6. Click Start.

The popup should show `Starting...` while `fiber.start()` is running and
`Success` after startup completes.

## Runtime Notes

The demo persists one generated Fiber key in popup `localStorage` under
`fiber-extension-demo:fiber-key`. It also uses `/fiber-extension-demo` as the
database prefix passed to `fiber.start()`. Reinstalling the extension or clearing
extension site data resets this local demo state.

The extension requests host access to `https://testnet.ckbapp.dev/*` because the
embedded Fiber config points the CKB RPC URL at that endpoint.

## Troubleshooting

If the popup reports a `SharedArrayBuffer` or `crossOriginIsolated` error, the
extension page is not cross-origin isolated. Confirm that you loaded the
`dist/chrome-mv3` output in Chrome or Chromium, not Firefox or Safari.

If the popup reports a worker or `blob` error, check the browser extension
console for Content Security Policy messages. The current `fiber-js` bundle
creates workers from generated JavaScript blobs, so CSP behavior is an important
part of this demo.

If the popup reports a WASM error, confirm that the two copied `.wasm` files are
present in `dist/chrome-mv3` and that the build copied them from the matching
Fiber checkout.

## Browser Support

Chrome / Chromium is the only supported runtime target for this demo.

Firefox and Safari extension pages generally cannot satisfy the
`crossOriginIsolated=true` and `SharedArrayBuffer` requirements used by the
current `fiber-js` implementation. See:

- `docs/firefox-fiber-js-extension-report.md`
- `docs/safari-fiber-js-extension-report.md`
