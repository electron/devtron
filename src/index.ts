import { app, ipcMain, session } from 'electron';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Direction, IpcEventData, IpcEventDataIndexed, ServiceWorkerDetails } from './types/shared';
import { excludedIpcChannels } from './common/constants';

interface TrackIpcEventOptions {
  direction: Direction;
  channel: string;
  args: any[];
  devtronSW: Electron.ServiceWorkerMain;
  serviceWorkerDetails?: ServiceWorkerDetails;
  method?: string;
}

let isInstalled = false;
let isInstalledToDefaultSession = false;
let devtronSW: Electron.ServiceWorkerMain;

/**
 * sends captured IPC events to the service-worker preload script
 */
function trackIpcEvent({
  direction,
  channel,
  args,
  devtronSW,
  serviceWorkerDetails,
  method,
}: TrackIpcEventOptions) {
  if (excludedIpcChannels.includes(channel)) return;

  if (devtronSW === null) {
    console.error('The service-worker for Devtron is not registered yet. Cannot track IPC event.');
    return;
  }

  let uuid = '';
  let newArgs = args;
  // extract the UUID if it exists
  if (args[0] && typeof args[0] === 'object' && args[0].__uuid__devtron) {
    uuid = args[0].__uuid__devtron;
    newArgs = args[0].args;
  }

  const eventData: IpcEventData = {
    direction,
    channel,
    args: newArgs,
    timestamp: Date.now(),
    serviceWorkerDetails,
  };

  if (method) eventData.method = method;
  if (uuid) eventData.uuid = uuid;

  devtronSW.send('devtron-render-event', eventData);
}

function registerIpcListeners(ses: Electron.Session, devtronSW: Electron.ServiceWorkerMain) {
  ses.on(
    // @ts-expect-error: '-ipc-message' is an internal event
    '-ipc-message',
    (
      event: Electron.IpcMainEvent | Electron.IpcMainServiceWorkerEvent,
      channel: string,
      args: any[],
    ) => {
      if (event.type === 'frame')
        trackIpcEvent({ direction: 'renderer-to-main', channel, args, devtronSW });
      else if (event.type === 'service-worker')
        trackIpcEvent({ direction: 'service-worker-to-main', channel, args, devtronSW });
    },
  );

  ses.on(
    // @ts-expect-error: '-ipc-invoke' is an internal event
    '-ipc-invoke',
    (
      event: Electron.IpcMainInvokeEvent | Electron.IpcMainServiceWorkerInvokeEvent,
      channel: string,
      args: any[],
    ) => {
      if (event.type === 'frame')
        trackIpcEvent({ direction: 'renderer-to-main', channel, args, devtronSW });
      else if (event.type === 'service-worker')
        trackIpcEvent({ direction: 'service-worker-to-main', channel, args, devtronSW });
    },
  );
  ses.on(
    // @ts-expect-error: '-ipc-message-sync' is an internal event
    '-ipc-message-sync',
    (
      event: Electron.IpcMainEvent | Electron.IpcMainServiceWorkerEvent,
      channel: string,
      args: any[],
    ) => {
      if (event.type === 'frame')
        trackIpcEvent({ direction: 'renderer-to-main', channel, args, devtronSW });
      else if (event.type === 'service-worker')
        trackIpcEvent({ direction: 'service-worker-to-main', channel, args, devtronSW });
    },
  );
}

/**
 * Registers a listener for the service worker's send method to track IPC events
 * sent from the main process to the service worker.
 */
function registerServiceWorkerSendListener(
  ses: Electron.Session,
  devtronSW: Electron.ServiceWorkerMain,
): void {
  const isInstalledSet = new Set<number>(); // stores version IDs of patched service workers

  // register listener for existing service workers
  const allRunning = ses.serviceWorkers.getAllRunning();
  for (const vid in allRunning) {
    const swInfo = allRunning[vid];

    const sw = ses.serviceWorkers.getWorkerFromVersionID(Number(vid));

    if (typeof sw === 'undefined' || sw.scope === devtronSW.scope) continue;
    isInstalledSet.add(swInfo.versionId);

    const originalSend = sw.send;
    sw.send = function (...args) {
      trackIpcEvent({
        direction: 'main-to-service-worker',
        channel: args[0],
        args: args.slice(1),
        devtronSW,
        serviceWorkerDetails: {
          serviceWorkerScope: sw.scope,
          serviceWorkerVersionId: sw.versionId,
        },
      });
      return originalSend.apply(this, args);
    };
  }

  // register listener for new service workers
  ses.serviceWorkers.on('running-status-changed', (details) => {
    if (details.runningStatus === 'running' || details.runningStatus === 'starting') {
      const sw = ses.serviceWorkers.getWorkerFromVersionID(details.versionId);

      if (
        typeof sw === 'undefined' ||
        sw.scope === devtronSW.scope ||
        isInstalledSet.has(sw.versionId)
      )
        return;

      isInstalledSet.add(details.versionId);

      const originalSend = sw.send;
      sw.send = function (...args) {
        trackIpcEvent({
          direction: 'main-to-service-worker',
          channel: args[0],
          args: args.slice(1),
          devtronSW,
          serviceWorkerDetails: {
            serviceWorkerScope: sw.scope,
            serviceWorkerVersionId: sw.versionId,
          },
        });
        return originalSend.apply(this, args);
      };
    }
  });
}

async function startServiceWorker(ses: Electron.Session, extension: Electron.Extension) {
  try {
    const sw = await ses.serviceWorkers.startWorkerForScope(extension.url);
    sw.startTask();
    devtronSW = sw;
    registerIpcListeners(ses, sw);
    registerServiceWorkerSendListener(ses, sw);
  } catch (error) {
    console.warn(`Failed to start Devtron service-worker (${error}), trying again...`);
    /**
     * This is a workaround for the issue where the Devtron service-worker fails to start
     * when the Electron app is launched for the first time, or when the service worker
     * hasn't been cached yet.
     */
    try {
      const handleDetails = async (
        event: Electron.Event,
        details: Electron.RegistrationCompletedDetails,
      ) => {
        if (details.scope === extension.url) {
          const sw = await ses.serviceWorkers.startWorkerForScope(extension.url);
          sw.startTask();
          devtronSW = sw;
          registerIpcListeners(ses, sw);
          registerServiceWorkerSendListener(ses, sw);
          ses.serviceWorkers.removeListener('registration-completed', handleDetails);
          console.log(`Devtron service-worker started successfully`);
        }
      };
      ses.serviceWorkers.on('registration-completed', handleDetails);
    } catch (error) {
      console.error('Failed to start Devtron service-worker:', error);
    }
  }
}

function patchIpcMain() {
  const listenerMap = new Map<string, Map<any, any>>(); // channel -> (originalListener -> tracked/cleaned Listener)

  const storeTrackedListener = (channel: string, original: any, tracked: any): void => {
    if (!listenerMap.has(channel)) {
      listenerMap.set(channel, new Map());
    }
    listenerMap.get(channel)!.set(original, tracked);
  };

  const getArgsFromPayload = (payload: any[]): any[] => {
    if (payload[0] && typeof payload[0] === 'object' && payload[0].__uuid__devtron) {
      // If the first argument is an object with __uuid__devtron, return its args property
      return payload[0].args || [];
    }
    // Otherwise, return the payload as is
    return payload;
  };

  const originalOn = ipcMain.on.bind(ipcMain);
  const originalOff = ipcMain.off.bind(ipcMain);
  const originalOnce = ipcMain.once.bind(ipcMain);
  const originalAddListener = ipcMain.addListener.bind(ipcMain);
  const originalRemoveListener = ipcMain.removeListener.bind(ipcMain);
  const originalRemoveAllListeners = ipcMain.removeAllListeners.bind(ipcMain);
  const originalHandle = ipcMain.handle.bind(ipcMain);
  const originalHandleOnce = ipcMain.handleOnce.bind(ipcMain);
  const originalRemoveHandler = ipcMain.removeHandler.bind(ipcMain);

  ipcMain.on = (
    channel: string,
    listener: (event: Electron.IpcMainEvent, ...args: any[]) => void,
  ) => {
    const cleanedListener = (event: Electron.IpcMainEvent, ...args: any[]) => {
      const newArgs = getArgsFromPayload(args);
      listener(event, ...newArgs);
    };
    storeTrackedListener(channel, listener, cleanedListener);
    return originalOn(channel, cleanedListener);
  };

  ipcMain.off = (
    channel: string,
    listener: (event: Electron.IpcMainEvent, ...args: any[]) => void,
  ) => {
    const channelMap = listenerMap.get(channel);
    const cleanedListener = channelMap?.get(listener);

    if (!cleanedListener) return ipcMain;

    channelMap?.delete(listener);
    if (channelMap && channelMap.size === 0) {
      listenerMap.delete(channel);
    }

    trackIpcEvent({ direction: 'main', channel, args: [], devtronSW, method: 'off' });
    return originalOff(channel, cleanedListener);
  };

  ipcMain.once = (
    channel: string,
    listener: (event: Electron.IpcMainEvent, ...args: any[]) => void,
  ) => {
    const cleanedListener = (event: Electron.IpcMainEvent, ...args: any[]) => {
      const newArgs = getArgsFromPayload(args);
      listener(event, ...newArgs);
    };
    return originalOnce(channel, cleanedListener);
  };

  ipcMain.addListener = (
    channel: string,
    listener: (event: Electron.IpcMainEvent, ...args: any[]) => void,
  ) => {
    const cleanedListener = (event: Electron.IpcMainEvent, ...args: any[]) => {
      const newArgs = getArgsFromPayload(args);
      listener(event, ...newArgs);
    };
    storeTrackedListener(channel, listener, cleanedListener);
    return originalAddListener(channel, cleanedListener);
  };

  ipcMain.removeListener = (
    channel: string,
    listener: (event: Electron.IpcMainEvent, ...args: any[]) => void,
  ) => {
    const channelMap = listenerMap.get(channel);
    const cleanedListener = channelMap?.get(listener);

    if (!cleanedListener) return ipcMain;

    // Remove the listener from the map
    channelMap?.delete(listener);
    // If no listeners left for this channel, remove the channel from the map
    if (channelMap && channelMap.size === 0) {
      listenerMap.delete(channel);
    }
    trackIpcEvent({ direction: 'main', channel, args: [], devtronSW, method: 'removeListener' });
    return originalRemoveListener(channel, cleanedListener);
  };

  ipcMain.removeAllListeners = (channel?: string) => {
    if (channel) {
      listenerMap.delete(channel);
      trackIpcEvent({
        direction: 'main',
        channel,
        args: [],
        devtronSW,
        method: 'removeAllListeners',
      });
      return originalRemoveAllListeners(channel);
    } else {
      listenerMap.clear();
      trackIpcEvent({
        direction: 'main',
        channel: '',
        args: [],
        devtronSW,
        method: 'removeAllListeners',
      });
      listenerMap.clear();
      return originalRemoveAllListeners();
    }
  };

  ipcMain.handle = (
    channel: string,
    listener: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any,
  ) => {
    const cleanedListener = async (event: Electron.IpcMainInvokeEvent, ...args: any[]) => {
      const newArgs = getArgsFromPayload(args);
      const result = await listener(event, ...newArgs);
      return result;
    };
    return originalHandle(channel, cleanedListener);
  };

  ipcMain.handleOnce = (
    channel: string,
    listener: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any,
  ) => {
    const cleanedListener = async (event: Electron.IpcMainInvokeEvent, ...args: any[]) => {
      const newArgs = getArgsFromPayload(args);
      const result = await listener(event, ...newArgs);
      return result;
    };
    return originalHandleOnce(channel, cleanedListener);
  };

  ipcMain.removeHandler = (channel: string) => {
    listenerMap.delete(channel);
    trackIpcEvent({ direction: 'main', channel, args: [], devtronSW, method: 'removeHandler' });
    return originalRemoveHandler(channel);
  };
}

async function install() {
  if (isInstalled) return;
  isInstalled = true;

  patchIpcMain();

  const installToSession = async (ses: Electron.Session) => {
    if (ses === session.defaultSession && isInstalledToDefaultSession) return;
    if (ses === session.defaultSession) isInstalledToDefaultSession = true;

    let devtron: Electron.Extension;
    try {
      // register service worker preload script
      const dirname = __dirname; // __dirname is replaced with import.meta.url in ESM builds using webpack
      const serviceWorkerPreloadPath = createRequire(dirname).resolve(
        '@electron/devtron/service-worker-preload',
      );
      const rendererPreloadPath = createRequire(dirname).resolve(
        '@electron/devtron/renderer-preload',
      );

      ses.registerPreloadScript({
        filePath: serviceWorkerPreloadPath,
        type: 'service-worker',
        id: 'devtron-sw-preload',
      });

      ses.registerPreloadScript({
        filePath: rendererPreloadPath,
        type: 'frame',
        id: 'devtron-renderer-preload',
      });

      // load extension
      const extensionPath = path.resolve(serviceWorkerPreloadPath, '..', '..', 'extension');
      devtron = await ses.extensions.loadExtension(extensionPath, { allowFileAccess: true });
      await startServiceWorker(ses, devtron);
      console.log('Devtron loaded successfully');
    } catch (error) {
      console.error('Failed to load Devtron:', error);
    }
  };

  app.on('session-created', installToSession);

  // explicitly install Devtron to the defaultSession in case the app is already ready
  if (!isInstalledToDefaultSession && app.isReady()) await installToSession(session.defaultSession);
}

/**
 * Retrieves the list of IPC events tracked by Devtron.
 *
 * - If called before installation or before the Devtron service worker is ready,
 *   an empty array will be returned.
 */
async function getEvents(): Promise<IpcEventDataIndexed[]> {
  if (!isInstalled) {
    console.warn('You are trying to get IPC events before Devtron is installed.');
    return [];
  }

  if (!devtronSW) {
    console.warn('Devtron service-worker is not registered yet. Cannot get IPC events.');
    return [];
  }

  devtronSW.send('devtron-get-ipc-events');

  return new Promise((resolve) => {
    devtronSW.ipc.once('devtron-ipc-events', (event, ipcEvents) => {
      resolve(ipcEvents);
    });
  });
}

export const devtron = {
  install,
  getEvents,
};
