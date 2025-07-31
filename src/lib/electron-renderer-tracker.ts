import { ipcRenderer } from 'electron';
import { MSG_TYPE } from '../common/constants';
import type { Direction, IpcEventData } from '../types/shared';
import { performance } from 'node:perf_hooks';
import { v4 as uuidv4 } from 'uuid';

interface PanelMessage {
  source: typeof MSG_TYPE.SEND_TO_PANEL;
  event: IpcEventData;
}

type IpcListener = (event: Electron.IpcRendererEvent, ...args: any[]) => void;

let isInstalled = false;

/**
 * Store tracked listeners in a map so that they can be removed later
 * if the user calls `removeListener`or `removeAllListeners`.
 */
const listenerMap = new Map<string, Map<IpcListener, IpcListener>>(); // channel -> (originalListener -> trackedListener)

function storeTrackedListener(channel: string, original: IpcListener, tracked: IpcListener): void {
  if (!listenerMap.has(channel)) {
    listenerMap.set(channel, new Map());
  }
  listenerMap.get(channel)!.set(original, tracked);
}

export function monitorRenderer(): void {
  if (isInstalled) {
    return;
  }
  isInstalled = true;

  const originalOn = ipcRenderer.on.bind(ipcRenderer);
  const originalOff = ipcRenderer.off.bind(ipcRenderer);
  const originalOnce = ipcRenderer.once.bind(ipcRenderer);
  const originalAddListener = ipcRenderer.addListener.bind(ipcRenderer);
  const originalRemoveListener = ipcRenderer.removeListener.bind(ipcRenderer);
  const originalRemoveAllListeners = ipcRenderer.removeAllListeners.bind(ipcRenderer);
  const originalSendSync = ipcRenderer.sendSync.bind(ipcRenderer);
  const originalInvoke = ipcRenderer.invoke.bind(ipcRenderer);

  ipcRenderer.on = function (
    channel: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) {
    const trackedListener = (event: Electron.IpcRendererEvent, ...args: any[]) => {
      track('main-to-renderer', channel, args, 'on');
      listener(event, ...args);
    };
    storeTrackedListener(channel, listener, trackedListener);
    return originalOn(channel, trackedListener);
  };

  ipcRenderer.off = function (
    channel: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) {
    const channelMap = listenerMap.get(channel);
    const tracked = channelMap?.get(listener);

    if (!tracked) return ipcRenderer;

    // Remove the listener from the map
    channelMap?.delete(listener);
    // If no listeners left for this channel, remove the channel from the map
    if (channelMap && channelMap.size === 0) {
      listenerMap.delete(channel);
    }

    track('renderer', channel, [], 'off');
    return originalOff(channel, tracked);
  };

  ipcRenderer.once = function (
    channel: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) {
    const trackedListener = (event: Electron.IpcRendererEvent, ...args: any[]) => {
      /**
       * not useful since `.once` = `.on + removeListener`.
       * hence, `.once` will be tracked as `.on` and then `.removeListener`.
       */
      // track('main-to-renderer', channel, args, 'once');
      listener(event, ...args);
    };
    return originalOnce(channel, trackedListener);
  };

  ipcRenderer.addListener = function (
    channel: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) {
    const trackedListener = (event: Electron.IpcRendererEvent, ...args: any[]) => {
      track('main-to-renderer', channel, args, 'addListener');
      listener(event, ...args);
    };
    storeTrackedListener(channel, listener, trackedListener);
    return originalAddListener(channel, trackedListener);
  };

  ipcRenderer.removeListener = function (
    channel: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) {
    const channelMap = listenerMap.get(channel);
    const tracked = channelMap?.get(listener);

    if (!tracked) return ipcRenderer;

    // Remove the listener from the map
    channelMap?.delete(listener);
    // If no listeners left for this channel, remove the channel from the map
    if (channelMap && channelMap.size === 0) {
      listenerMap.delete(channel);
    }

    track('renderer', channel, [], 'removeListener');
    return originalRemoveListener(channel, tracked);
  };

  ipcRenderer.removeAllListeners = function (channel?: string): Electron.IpcRenderer {
    if (channel) {
      listenerMap.delete(channel);
      const result = originalRemoveAllListeners(channel);
      track('renderer', channel, [], 'removeAllListeners');
      return result;
    } else {
      listenerMap.clear();
      const result = originalRemoveAllListeners();
      track('renderer', '', [], 'removeAllListeners');
      return result;
    }
  };

  ipcRenderer.sendSync = function (channel: string, ...args: any[]) {
    const uuid = uuidv4(); // uuid is used to match the response with the request
    const payload = {
      __uuid__devtron: uuid,
      args,
    };
    const start = performance.now();
    const result = originalSendSync(channel, payload);
    const duration = performance.now() - start;

    track('main-to-renderer', channel, [result], 'sendSync (response)', duration, uuid);

    return result;
  };

  ipcRenderer.invoke = async function (channel: string, ...args: any[]): Promise<any> {
    const uuid = uuidv4(); // uuid is used to match the response with the request
    const payload = {
      __uuid__devtron: uuid,
      args,
    };
    const start = performance.now();
    const result = await originalInvoke(channel, payload);
    const duration = performance.now() - start;

    track('main-to-renderer', channel, [result], 'invoke (response)', duration, uuid);

    return result;
  };
}

function track(
  direction: Direction,
  channel: string,
  args: any[],
  method?: string,
  responseTime?: number,
  uuid?: string,
): void {
  const event: IpcEventData = {
    timestamp: Date.now(),
    direction,
    channel,
    args: copyArgs(args),
    uuid,
  };
  if (method) event.method = method;
  if (responseTime) event.responseTime = responseTime;

  const message: PanelMessage = {
    source: MSG_TYPE.SEND_TO_PANEL,
    event,
  };

  window.postMessage(message, '*');
}

function copyArgs(args: any[]): any[] {
  try {
    return structuredClone(args);
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Error cloning args: ${message}`);
    return [`[Could not clone args: ${message}]`];
  }
}
