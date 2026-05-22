import { browser } from "wxt/browser";
import { defineBackground } from "wxt/sandbox";
import type { OffscreenEnsureResponse, OffscreenExistsResponse } from "../src/shared/messages";
import { createMessageQueue, isRuntimeMessage } from "../src/shared/util";

const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

const enqueueMessage = createMessageQueue();
let creatingOffscreenDocument: Promise<void> | undefined;

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(handleBackgroundMessage);
});

function handleBackgroundMessage(message: unknown) {
  if (!isRuntimeMessage(message, "background")) {
    return;
  }

  if (message.type === "offscreen:ensure") {
    return enqueueMessage(async (): Promise<OffscreenEnsureResponse> => {
      await ensureOffscreenDocument();
      return { ok: true };
    });
  }

  if (message.type === "offscreen:exists") {
    return enqueueMessage(async (): Promise<OffscreenExistsResponse> => ({
      exists: await hasOffscreenDocument()
    }));
  }
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument())
    return;

  const offscreen = (
    browser as typeof browser & {
      offscreen?: {
        createDocument(parameters: {
          url: string;
          reasons: Array<"BLOBS" | "WORKERS" | "LOCAL_STORAGE">;
          justification: string;
        }): Promise<void>;
      };
    }
  ).offscreen;
  if (!offscreen) {
    throw new Error("chrome.offscreen is unavailable. Chrome 109+ Manifest V3 is required.");
  }

  creatingOffscreenDocument ??= offscreen
    .createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: ["BLOBS", "WORKERS", "LOCAL_STORAGE"],
      justification: "Run fiber-js in a hidden extension document with workers and local state."
    })
    .finally(() => {
      creatingOffscreenDocument = undefined;
    });

  await creatingOffscreenDocument;
}

async function hasOffscreenDocument(): Promise<boolean> {
  const runtime = browser.runtime as typeof browser.runtime & {
    getContexts?: (filter: { contextTypes: string[]; documentUrls: string[] }) => Promise<Array<unknown>>;
    getURL(path: string): string;
  };
  const offscreenUrl = runtime.getURL(OFFSCREEN_DOCUMENT_PATH);

  if (typeof runtime.getContexts === "function") {
    const contexts = await runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl]
    });
    return contexts.length > 0;
  }

  const clients = (
    globalThis as typeof globalThis & {
      clients?: {
        matchAll(): Promise<Array<{ url: string }>>;
      };
    }
  ).clients;
  const matchedClients = await clients?.matchAll();
  return matchedClients?.some((client) => client.url === offscreenUrl) ?? false;
}
