import { browser } from "wxt/browser";
import { Fiber, randomSecretKey } from "@nervosnetwork/fiber-js";
import type { NodeInfoResult } from "@nervosnetwork/fiber-js";
import { FIBER_CONFIG, FIBER_DATABASE_PREFIX, getStoredSecret, storeSecret } from "./fiber-config";
import type {
  FiberConnectPeerRequest,
  FiberConnectPeerResponse,
  FiberStartResponse,
  FiberStatusResponse
} from "../shared/messages";
import { createMessageQueue, isRuntimeMessage } from "../shared/util";

let startPromise: Promise<FiberStartResponse> | undefined;
let cachedStartResponse: FiberStartResponse | undefined;
let startedMessage: string | undefined;
let fiber: Fiber | undefined;
let nodeInfo: NodeInfoResult | undefined;
const enqueueMessage = createMessageQueue();

declare global {
  interface Window {
    fiber?: Fiber;
  }
}

function assertRuntimeSupport(): void {
  if (window.isSecureContext !== true) {
    throw new Error("Failed: extension document is not running in a secure context.");
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

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isRuntimeMessage(message, "offscreen"))
    return;

  if (message.type === "fiber:start") {
    return enqueueMessage(() => {
      if (cachedStartResponse?.ok)
        return cachedStartResponse;
      startPromise ??= startFiber();
      return startPromise;
    });
  }

  else if (message.type === "fiber:status")
    return enqueueMessage(() => getFiberStatus());

  else if (message.type === "fiber:peer-connect")
    return enqueueMessage(() => connectPeer(message as FiberConnectPeerRequest));

});

async function startFiber(): Promise<FiberStartResponse> {
  if (cachedStartResponse?.ok)
    return cachedStartResponse;

  assertRuntimeSupport();

  fiber ??= new Fiber();
  window.fiber = fiber;

  let fiberKey = getStoredSecret();
  if (!fiberKey) {
    fiberKey = randomSecretKey();
    storeSecret(fiberKey);
  }

  await fiber.start(FIBER_CONFIG, fiberKey, undefined, undefined, "info", FIBER_DATABASE_PREFIX);
  nodeInfo = await fiber.nodeInfo();
  startedMessage = "Success";
  cachedStartResponse = {
    ok: true,
    message: startedMessage,
    ...(nodeInfo ? { nodeInfo } : {})
  };
  return cachedStartResponse;
}

async function getFiberStatus(): Promise<FiberStatusResponse> {
  if (startedMessage === undefined) {
    return { running: false };
  }
  if (fiber) {
    nodeInfo = await fiber.nodeInfo();
  }
  return {
    running: true,
    message: startedMessage,
    nodeInfo
  };
}

async function connectPeer(message: FiberConnectPeerRequest): Promise<FiberConnectPeerResponse> {
  if (!message.address.trim()) {
    throw new Error("Peer address is required.");
  }

  await startFiber();
  if (!fiber) {
    throw new Error("Fiber runtime is unavailable.");
  }

  const address = message.address.trim();
  await fiber.connectPeer({ address, save: true });
  nodeInfo = await fiber.nodeInfo();

  return {
    ok: true,
    message: `Connected peer: ${address}`,
    ...(nodeInfo ? { nodeInfo } : {})
  };
}
