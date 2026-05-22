import { browser } from "wxt/browser";
import type { NodeInfoResult } from "@nervosnetwork/fiber-js";
import type {
  FiberConnectPeerResponse,
  FiberStartResponse,
  FiberStatusResponse,
  OffscreenExistsResponse
} from "../shared/messages";

const OFFSCREEN_MESSAGE_RETRIES = 5;
const OFFSCREEN_MESSAGE_RETRY_DELAY_MS = 100;

const statusCard = requireElement<HTMLElement>("#fiber-status-card");
const statusDot = requireElement<HTMLElement>("#status-dot");
const statusRefreshButton = requireElement<HTMLButtonElement>("#status-refresh-button");
const statusLabel = requireElement<HTMLElement>("#status-label");
const nodeName = requireElement<HTMLElement>("#node-name");
const nodePubkey = requireElement<HTMLElement>("#node-pubkey");
const peerCount = requireElement<HTMLElement>("#peer-count");
const channelCount = requireElement<HTMLElement>("#channel-count");
const peerConnectForm = requireElement<HTMLFormElement>("#peer-connect-form");
const peerAddressInput = requireElement<HTMLInputElement>("#peer-address-input");
const peerConnectButton = requireElement<HTMLButtonElement>("#peer-connect-button");

peerConnectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void connectPeer();
});

statusRefreshButton.addEventListener("click", () => {
  void refreshFiberStatus();
});

peerAddressInput.addEventListener("input", () => {
  peerAddressInput.setCustomValidity("");
});

void initializePopup();

async function initializePopup(): Promise<void> {
  renderStarting("Checking offscreen Fiber runtime...");

  try {
    const offscreen = (await browser.runtime.sendMessage({
      target: "background",
      type: "offscreen:exists"
    })) as OffscreenExistsResponse;

    if (!offscreen.exists) {
      await startFiber();
      return;
    }

    const response = (await sendMessageToOffscreenWithRetry({
      target: "offscreen",
      type: "fiber:status"
    })) as FiberStatusResponse;

    if (response.running) {
      renderRunning(response.nodeInfo, response.message ?? "Success");
      return;
    }
  } catch {
    // Fall through to startup. Opening the popup is the startup trigger.
  }

  await startFiber();
}

async function startFiber(): Promise<void> {
  renderStarting("Starting offscreen Fiber runtime...");

  await browser.runtime.sendMessage({
    target: "background",
    type: "offscreen:ensure"
  });

  const response = (await sendMessageToOffscreenWithRetry({
    target: "offscreen",
    type: "fiber:start"
  })) as FiberStartResponse;

  renderRunning(response.nodeInfo, response.message);
}

async function connectPeer(): Promise<void> {
  const address = peerAddressInput.value.trim();
  if (!address) {
    peerAddressInput.setCustomValidity("Enter a Fiber node address before connecting.");
    peerAddressInput.reportValidity();
    peerAddressInput.focus();
    return;
  }

  peerAddressInput.setCustomValidity("");
  setPeerConnectPending(true);

  try {
    const response = (await sendMessageToOffscreenWithRetry({
      target: "offscreen",
      type: "fiber:peer-connect",
      address
    })) as FiberConnectPeerResponse;

    renderRunning(response.nodeInfo, response.message);
  } catch (error) {
    renderError(formatError(error));
  } finally {
    setPeerConnectPending(false);
  }
}

async function refreshFiberStatus(): Promise<void> {
  setStatusRefreshPending(true);

  try {
    const response = (await sendMessageToOffscreenWithRetry({
      target: "offscreen",
      type: "fiber:status"
    })) as FiberStatusResponse;

    if (response.running) {
      renderRunning(response.nodeInfo, response.message ?? "Success");
      return;
    }

    await startFiber();
  } catch (error) {
    renderError(formatError(error));
  } finally {
    setStatusRefreshPending(false);
  }
}

async function sendMessageToOffscreenWithRetry(message: unknown): Promise<unknown> {
  let response: unknown;
  let lastError: unknown;
  for (let attempt = 0; attempt < OFFSCREEN_MESSAGE_RETRIES; attempt += 1) {
    try {
      response = await browser.runtime.sendMessage(message);
      if (response !== null && response !== undefined) return response;
    } catch (error) {
      lastError = error;
    }
    await delay(OFFSCREEN_MESSAGE_RETRY_DELAY_MS);
  }
  if (lastError !== undefined) throw lastError;
  return response;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Popup markup is missing required element: ${selector}`);
  }
  return element;
}

function renderStarting(message: string): void {
  statusCard.dataset.state = "starting";
  statusDot.setAttribute("aria-label", "Starting");
  statusLabel.textContent = "Starting";
  statusRefreshButton.disabled = true;
  statusRefreshButton.removeAttribute("data-pending");
  nodeName.textContent = "Fiber";
  nodePubkey.textContent = message;
  peerCount.textContent = "-";
  channelCount.textContent = "-";
  peerConnectButton.disabled = true;
}

function renderRunning(info: NodeInfoResult | undefined, message: string): void {
  statusCard.dataset.state = "running";
  statusDot.setAttribute("aria-label", "Running");
  statusLabel.textContent = "Running";
  statusRefreshButton.disabled = false;
  nodeName.textContent = info?.node_name || "Fiber node";
  nodePubkey.textContent = info?.pubkey ?? message;
  peerCount.textContent = info?.peers_count ?? "0x0";
  channelCount.textContent = info?.channel_count ?? "0x0";
  peerConnectButton.disabled = false;
}

function renderError(message: string): void {
  statusCard.dataset.state = "error";
  statusDot.setAttribute("aria-label", "Error");
  statusLabel.textContent = "Error";
  statusRefreshButton.disabled = true;
  statusRefreshButton.removeAttribute("data-pending");
  nodePubkey.textContent = message;
}

function setPeerConnectPending(pending: boolean): void {
  peerAddressInput.disabled = pending;
  peerConnectButton.disabled = pending;
  peerConnectButton.textContent = pending ? "Connecting" : "Connect";
}

function setStatusRefreshPending(pending: boolean): void {
  statusRefreshButton.disabled = pending;
  statusRefreshButton.toggleAttribute("data-pending", pending);
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Failed to connect peer.";
}
