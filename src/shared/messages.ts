import type { NodeInfoResult } from "@nervosnetwork/fiber-js";

export type FiberStartRequest = {
  target: "offscreen";
  type: "fiber:start";
};

export type FiberStatusRequest = {
  target: "offscreen";
  type: "fiber:status";
};

export type FiberConnectPeerRequest = {
  target: "offscreen";
  type: "fiber:peer-connect";
  address: string;
};

export type OffscreenEnsureRequest = {
  target: "background";
  type: "offscreen:ensure";
};

export type OffscreenExistsRequest = {
  target: "background";
  type: "offscreen:exists";
};

export type FiberStartResponse =
  {
    ok: true;
    message: string;
    nodeInfo?: NodeInfoResult;
  };

export type FiberStatusResponse = {
  running: boolean;
  message?: string;
  nodeInfo?: NodeInfoResult;
};

export type FiberConnectPeerResponse = {
  ok: true;
  message: string;
  nodeInfo?: NodeInfoResult;
};

export type OffscreenEnsureResponse =
  {
    ok: true;
  };

export type OffscreenExistsResponse = {
  exists: boolean;
};
