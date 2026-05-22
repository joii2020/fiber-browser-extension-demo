export type RuntimeMessage = {
  target: string;
  type: string;
};

export function isRuntimeMessage(message: unknown, target?: string): message is RuntimeMessage {
  if (message === null || typeof message !== "object" || !("type" in message) || !("target" in message))
    return false;

  const runtimeMessage = message as { target: unknown; type: unknown };
  if (typeof runtimeMessage.target !== "string" || typeof runtimeMessage.type !== "string")
    return false;

  return target === undefined || runtimeMessage.target === target;
}

export function createMessageQueue(): <T>(handler: () => T | Promise<T>) => Promise<T> {
  let messageQueue: Promise<void> = Promise.resolve();
  return <T>(handler: () => T | Promise<T>): Promise<T> => {
    const response = messageQueue.then(handler, handler);
    messageQueue = response.then(
      () => undefined,
      () => undefined
    );
    return response;
  };
}
