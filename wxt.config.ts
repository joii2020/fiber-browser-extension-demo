import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "wxt";

const require = createRequire(import.meta.url);
const requireFiberJsWasmAssets = process.env.FIBER_JS_REQUIRE_WASM_ASSETS === "true";

function resolveFiberJsBundle(): string {
  try {
    return require.resolve("@nervosnetwork/fiber-js");
  } catch (error) {
    throw new Error(
      "Unable to resolve @nervosnetwork/fiber-js. Run `pnpm install` before building.",
      { cause: error }
    );
  }
}

function findFiberJsWasmAssets(fiberJsBundle: string): string[] {
  const fiberJsPackageRoot = path.dirname(path.dirname(fiberJsBundle));
  const wasmFileNames = new Set(
    fs.readFileSync(fiberJsBundle, "utf8").match(/[A-Fa-f0-9]{16,}\.wasm/g) ?? []
  );
  const wasmFiles = [...wasmFileNames]
    .map((fileName) => path.join(fiberJsPackageRoot, "dist", fileName))
    .sort();

  if (wasmFiles.length === 0) {
    throw new Error(
      `No WASM asset references were found in ${fiberJsBundle}. Check the installed @nervosnetwork/fiber-js package.`
    );
  }

  const missingWasmFiles = wasmFiles.filter((file) => !fs.existsSync(file));
  if (missingWasmFiles.length > 0) {
    const message = [
      "The installed @nervosnetwork/fiber-js package references WASM assets that are not present in the package:",
      ...missingWasmFiles.map((file) => `- ${file}`),
      "The extension build will continue without those files. Runtime WASM loading may fail unless the installed npm package inlines them or a later release includes them.",
      "Set FIBER_JS_REQUIRE_WASM_ASSETS=true to make this a build error."
    ].join("\n");
    if (requireFiberJsWasmAssets) {
      throw new Error(message);
    }
    console.warn(message);
  }

  return wasmFiles.filter((file) => fs.existsSync(file));
}

export default defineConfig({
  outDir: "dist",
  manifest: {
    name: "Fiber WASM Demo",
    version: "0.1.0",
    description: "Minimal extension popup that starts fiber-js in an offscreen document.",
    minimum_chrome_version: "109",
    action: {
      default_title: "Fiber WASM Demo"
    },
    permissions: ["offscreen"],
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
      const fiberJsBundle = resolveFiberJsBundle();
      const fiberWasmAssets = findFiberJsWasmAssets(fiberJsBundle);

      files.push(
        {
          absoluteSrc: fiberJsBundle,
          relativeDest: "vendor/fiber-js.js"
        }
      );
      for (const wasmAsset of fiberWasmAssets) {
        files.push({
          absoluteSrc: wasmAsset,
          relativeDest: path.basename(wasmAsset)
        });
      }
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
