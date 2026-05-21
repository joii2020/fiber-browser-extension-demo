import { Fiber, randomSecretKey } from "@nervosnetwork/fiber-js";
import { FIBER_CONFIG, FIBER_DATABASE_PREFIX, getStoredSecret, storeSecret } from "./fiber-config";
import { assertRuntimeSupport } from "./runtime-probe";

const startButton = requireElement<HTMLButtonElement>("#start");
const output = requireElement<HTMLElement>("#output");

startButton.addEventListener("click", () => {
  void startFiber();
});

async function startFiber(): Promise<void> {
  startButton.disabled = true;
  output.textContent = "Starting...";

  try {
    assertRuntimeSupport();

    const fiber = new Fiber();
    let fiberKey = getStoredSecret();
    if (!fiberKey) {
      fiberKey = randomSecretKey();
      storeSecret(fiberKey);
    }

    await fiber.start(FIBER_CONFIG, fiberKey, undefined, undefined, "info", FIBER_DATABASE_PREFIX);
    output.textContent = "Success";
  } catch (error) {
    startButton.disabled = false;
    output.textContent = formatError(error);
  }
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Popup markup is missing required element: ${selector}`);
  }
  return element;
}

function formatError(error: unknown): string {
  const message = errorToMessage(error);
  if (/SharedArrayBuffer/i.test(message)) return `Failed: SharedArrayBuffer error. ${message}`;
  if (/crossOriginIsolated|COOP|COEP/i.test(message)) return `Failed: cross-origin isolation error. ${message}`;
  if (/Worker|blob/i.test(message)) return `Failed: worker load error. ${message}`;
  if (/wasm|WebAssembly/i.test(message)) return `Failed: WASM load error. ${message}`;
  return `Failed: ${message}`;
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
