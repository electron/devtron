import type { ServiceWorkerMain } from 'electron';
import type { IpcEventDataIndexed } from '../src/types/shared';
import { BrowserWindow, ipcMain, session } from 'electron';
import { devtron } from '../src/index';
import { expect } from 'chai';

let devtronSW: ServiceWorkerMain | undefined;
let ipcEvents: IpcEventDataIndexed[] = [];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches IPC events stored in Devtron's service worker.
 */
async function getEvents(): Promise<IpcEventDataIndexed[]> {
  if (!devtronSW) throw new Error('Devtron service worker is not registered yet.');

  devtronSW.send('devtron-get-ipc-events');

  return new Promise((resolve) => {
    devtronSW?.ipc.once('devtron-ipc-events', (event, ipcEvents) => {
      resolve(ipcEvents);
    });
  });
}

describe('Devtron Installation', () => {
  /* --------------- test on defaultSession --------------- */
  before(async () => {
    if (!session.defaultSession) throw new Error('Default session is not available');

    await devtron.install();
  });

  it('should load the extension in defaultSession', () => {
    expect(
      session.defaultSession.extensions
        .getAllExtensions()
        .map((ext) => ext.name)
        .includes('devtron'),
    ).to.be.true;
  });

  it('should register the service worker preload script in defaultSession', () => {
    expect(
      session.defaultSession.getPreloadScripts().some((script) => {
        return script.id === 'devtron-sw-preload' && script.type === 'service-worker';
      }),
    ).to.be.true;
  });

  it('should register the renderer preload script in defaultSession', () => {
    expect(
      session.defaultSession.getPreloadScripts().some((script) => {
        return script.id === 'devtron-renderer-preload' && script.type === 'frame';
      }),
    ).to.be.true;
  });

  /* ----------- test on newly created sessions ----------- */
  let newSes: Electron.Session;
  before(() => {
    newSes = session.fromPartition('persist:devtron-test-session');
    if (!newSes) throw new Error('New session is not available');
  });

  it('should load the extension in newly created sessions', () => {
    expect(
      newSes.extensions
        .getAllExtensions()
        .map((ext) => ext.name)
        .includes('devtron'),
    ).to.be.true;
  });

  it('should register the service worker preload script in newly created sessions', () => {
    expect(
      newSes.getPreloadScripts().some((script) => {
        return script.id === 'devtron-sw-preload' && script.type === 'service-worker';
      }),
    ).to.be.true;
  });

  it('should register the renderer preload script in newly created sessions', () => {
    expect(
      newSes.getPreloadScripts().some((script) => {
        return script.id === 'devtron-renderer-preload' && script.type === 'frame';
      }),
    ).to.be.true;
  });
});

function registerDevtronIpc() {
  if (!devtronSW) {
    let devtronId = '';
    session.defaultSession.extensions.getAllExtensions().map((ext) => {
      if (ext.name === 'devtron') devtronId = ext.id;
    });

    const allRunning = session.defaultSession.serviceWorkers.getAllRunning();
    for (const vid in allRunning) {
      const swInfo = allRunning[vid];
      if (devtronId && swInfo.scope.includes(devtronId)) {
        devtronSW = session.defaultSession.serviceWorkers.getWorkerFromVersionID(Number(vid));
      }
    }
  }
}

describe('Tracking IPC Events', () => {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (!mainWindow) throw new Error('Main window is not available');

  before(async () => {
    ipcMain.on('test-main-on', () => {});

    ipcMain.on('test-main-sendSync', (event) => {
      event.returnValue = 'pong';
    });

    ipcMain.once('test-main-once', () => {});

    ipcMain.handle('test-main-handle', async () => {
      return 'handled';
    });

    ipcMain.handleOnce('test-main-handle-once', async () => {
      return 'handled';
    });

    await delay(3000); // If some test fails when it shouldn't, try increasing this delay
    registerDevtronIpc();

    mainWindow.webContents.send('test-renderer-on', 'arg1', 'arg2');
    mainWindow.webContents.send('test-renderer-addListener', 'arg1', 'arg2');
    mainWindow.webContents.send('test-renderer-once', 'arg1', 'arg2');
    mainWindow.webContents.send('request-ipc-renderer-events', 'arg1', 'arg2');

    // test if the listener is actually removed or not by sending an event
    mainWindow.webContents.send('test-renderer-off', 'arg1', 'arg2');
    mainWindow.webContents.send('test-renderer-removeListener', 'arg1', 'arg2');
    mainWindow.webContents.send('test-renderer-removeAllListeners', 'arg1', 'arg2');

    // testing removal of ipcMain listeners
    const listener = () => {};
    ipcMain.on('test-main-off', listener);
    ipcMain.on('test-main-removeListener', listener);
    ipcMain.on('test-main-removeAllListeners', listener);
    ipcMain.handle('test-main-removeHandler', async () => {
      return;
    });
    ipcMain.off('test-main-off', listener);
    ipcMain.removeListener('test-main-removeListener', listener);
    ipcMain.removeAllListeners('test-main-removeAllListeners');
    ipcMain.removeHandler('test-main-removeHandler');

    await delay(300);

    /**
     * During testing, the `devtronSW` variable in "src/index.ts"
     * is not the same instance as the one used here. As a result,
     * some events are sent to that instance and some to this one.
     * Therefore, to capture all events, we need to combine events
     * from both instances.
     *
     * This behavior does not occur during normal usage of Devtron.
     * It may be caused by directly importing `devtron` from "src/index.ts" here.
     */
    ipcEvents = await getEvents();
    ipcEvents.push(...(await devtron.getEvents()));
  });

  it('should track ipcRenderer.on', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'renderer-to-main' &&
        e.channel === 'test-main-on' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        typeof e.timestamp === 'number',
    );
    expect(ev).to.exist;
  });

  it('should track ipcRenderer.addListener', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'main-to-renderer' &&
        e.channel === 'test-renderer-addListener' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        e.method === 'addListener' &&
        typeof e.timestamp === 'number',
    );
    expect(ev).to.exist;
  });

  it('should track ipcRenderer.once', () => {
    const ev_on = ipcEvents.find(
      (e) =>
        e.direction === 'main-to-renderer' &&
        e.channel === 'test-renderer-once' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        e.method === 'on' &&
        typeof e.timestamp === 'number',
    );

    const ev_removeListener = ipcEvents.find(
      (e) =>
        e.direction === 'renderer' &&
        e.channel === 'test-renderer-once' &&
        Array.isArray(e.args) &&
        e.args.length === 0 &&
        e.method === 'removeListener' &&
        typeof e.timestamp === 'number',
    );

    expect(ev_on, 'Expected an ipcRenderer.on event').to.exist;
    expect(ev_removeListener, 'Expected an ipcRenderer.removeListener event').to.exist;
  });

  it('should track ipcRenderer.sendSync', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'renderer-to-main' &&
        e.channel === 'test-main-sendSync' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        typeof e.uuid === 'string' &&
        typeof e.timestamp === 'number',
    );
    expect(ev).to.exist;
  });

  it('should track response received by ipcRenderer.sendSync', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'main-to-renderer' &&
        e.channel === 'test-main-sendSync' &&
        Array.isArray(e.args) &&
        e.args[0] === 'pong' &&
        typeof e.uuid === 'string' &&
        typeof e.timestamp === 'number' &&
        e.method === 'sendSync (response)' &&
        typeof e.responseTime === 'number',
    );
    expect(ev).to.exist;
  });

  it('should track ipcRenderer.invoke', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'renderer-to-main' &&
        e.channel === 'test-main-handle' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        typeof e.uuid === 'string' &&
        typeof e.timestamp === 'number',
    );
    expect(ev).to.exist;
  });

  // This also indirectly tests that ipcMain.handle is tracked properly
  it('should track response received by ipcRenderer.invoke', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'main-to-renderer' &&
        e.channel === 'test-main-handle' &&
        Array.isArray(e.args) &&
        e.args[0] === 'handled' &&
        typeof e.uuid === 'string' &&
        typeof e.timestamp === 'number' &&
        e.method === 'invoke (response)' &&
        typeof e.responseTime === 'number',
    );
    expect(ev).to.exist;
  });

  it('should track ipcRenderer.removeListener', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'renderer' &&
        e.channel === 'test-renderer-removeListener' &&
        Array.isArray(e.args) &&
        e.args.length === 0 &&
        e.method === 'removeListener' &&
        typeof e.timestamp === 'number',
    );
    expect(ev).to.exist;

    const ev_after = ipcEvents.find(
      (e) =>
        e.direction === 'main-to-renderer' &&
        e.channel === 'test-renderer-removeListener' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        e.method === 'on',
    );
    expect(ev_after).to.not.exist;
  });

  it('should track ipcRenderer.off', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'renderer' &&
        e.channel === 'test-renderer-off' &&
        Array.isArray(e.args) &&
        e.args.length === 0 &&
        e.method === 'off' &&
        typeof e.timestamp === 'number',
    );
    expect(ev).to.exist;

    const ev_after = ipcEvents.find(
      (e) =>
        e.direction === 'main-to-renderer' &&
        e.channel === 'test-renderer-off' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        e.method === 'on',
    );
    expect(ev_after).to.not.exist;
  });

  it('should track ipcRenderer.removeAllListeners', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'renderer' &&
        e.channel === 'test-renderer-removeAllListeners' &&
        Array.isArray(e.args) &&
        e.args.length === 0 &&
        e.method === 'removeAllListeners' &&
        typeof e.timestamp === 'number',
    );
    expect(ev).to.exist;

    const ev_after = ipcEvents.find(
      (e) =>
        e.direction === 'main-to-renderer' &&
        e.channel === 'test-renderer-removeAllListeners' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        e.method === 'on',
    );
    expect(ev_after).to.not.exist;
  });

  it('should track ipcMain.on', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'main-to-renderer' &&
        e.channel === 'test-renderer-on' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        e.method === 'on',
    );
    expect(ev).to.exist;
  });

  it('should track ipcMain.handleOnce', () => {
    const ev_removeHandler = ipcEvents.find(
      (e) =>
        e.direction === 'main' &&
        e.channel === 'test-main-handle-once' &&
        Array.isArray(e.args) &&
        e.args.length === 0 &&
        e.method === 'removeHandler' &&
        typeof e.timestamp === 'number',
    );
    const ev_invoke = ipcEvents.find(
      (e) =>
        e.direction === 'renderer-to-main' &&
        e.channel === 'test-main-handle-once' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        typeof e.uuid === 'string' &&
        typeof e.timestamp === 'number',
    );

    const ev_response = ipcEvents.find(
      (e) =>
        e.direction === 'main-to-renderer' &&
        e.channel === 'test-main-handle-once' &&
        Array.isArray(e.args) &&
        e.args[0] === 'handled' &&
        typeof e.uuid === 'string' &&
        typeof e.timestamp === 'number' &&
        e.method === 'invoke (response)' &&
        typeof e.responseTime === 'number',
    );

    expect(ev_removeHandler, 'Expected an ipcMain.removeHandler event').to.exist;
    expect(ev_invoke, 'Expected an ipcRenderer.invoke event').to.exist;
    expect(ev_response, 'Expected an ipcRenderer.invoke (response) event').to.exist;
  });

  it('should track ipcMain.once', () => {
    const ev_removeListener = ipcEvents.find(
      (e) =>
        e.direction === 'main' &&
        e.channel === 'test-main-once' &&
        Array.isArray(e.args) &&
        e.args.length === 0 &&
        e.method === 'removeListener' &&
        typeof e.timestamp === 'number',
    );
    const ev_on = ipcEvents.find(
      (e) =>
        e.direction === 'renderer-to-main' &&
        e.channel === 'test-main-once' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        typeof e.timestamp === 'number',
    );

    expect(ev_removeListener, 'Expected an ipcMain.removeListener event').to.exist;
    expect(ev_on, 'Expected an ipcRenderer.on event').to.exist;
  });

  it('should track ipcMain.off', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'main' &&
        e.channel === 'test-main-off' &&
        Array.isArray(e.args) &&
        e.args.length === 0 &&
        e.method === 'off' &&
        typeof e.timestamp === 'number',
    );
    expect(ev).to.exist;
  });

  it('should track ipcMain.removeListener', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'main' &&
        e.channel === 'test-main-removeListener' &&
        Array.isArray(e.args) &&
        e.args.length === 0 &&
        e.method === 'removeListener' &&
        typeof e.timestamp === 'number',
    );
    expect(ev).to.exist;
  });

  it('should track ipcMain.removeAllListeners', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'main' &&
        e.channel === 'test-main-removeAllListeners' &&
        Array.isArray(e.args) &&
        e.args.length === 0 &&
        e.method === 'removeAllListeners' &&
        typeof e.timestamp === 'number',
    );
    expect(ev).to.exist;
  });

  it('should track ipcMain.removeHandler', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'main' &&
        e.channel === 'test-main-removeHandler' &&
        Array.isArray(e.args) &&
        e.args.length === 0 &&
        e.method === 'removeHandler' &&
        typeof e.timestamp === 'number',
    );
    expect(ev).to.exist;
  });
});
