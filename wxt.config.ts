import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "wxt";

const root = path.dirname(fileURLToPath(import.meta.url));
const fiberRoot = path.resolve(root, "../fiber");

export default defineConfig({
  outDir: "dist",
  manifest: {
    name: "Fiber WASM Demo",
    version: "0.1.0",
    description: "Minimal extension popup that starts fiber-js in an extension page.",
    action: {
      default_title: "Fiber WASM Demo"
    },
    permissions: [],
    host_permissions: ["https://testnet.ckbapp.dev/*"],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; object-src 'self';"
    },
    cross_origin_embedder_policy: {
      value: "require-corp"
    },
    cross_origin_opener_policy: {
      value: "same-origin"
    }
  },
  hooks: {
    "build:publicAssets": (_, files) => {
      files.push(
        {
          absoluteSrc: path.join(fiberRoot, "fiber-js/dist/index.js"),
          relativeDest: "vendor/fiber-js.js"
        },
        {
          absoluteSrc: path.join(fiberRoot, "crates/fiber-wasm/dist/27ea9610449860a700f7.wasm"),
          relativeDest: "27ea9610449860a700f7.wasm"
        },
        {
          absoluteSrc: path.join(
            fiberRoot,
            "crates/fiber-wasm-db-worker/dist/ce0d9f4142d556152245.wasm"
          ),
          relativeDest: "ce0d9f4142d556152245.wasm"
        }
      );
    }
  },
  vite: () => ({
    build: {
      rollupOptions: {
        external: ["@nervosnetwork/fiber-js"],
        output: {
          paths: {
            "@nervosnetwork/fiber-js": "/vendor/fiber-js.js"
          }
        }
      }
    }
  })
});
