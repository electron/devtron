import type { ServiceWorkerMain } from 'electron';
import type { IpcEventDataIndexed } from '../src/types/shared';
import { BrowserWindow, ipcMain, session } from 'electron';
import { devtron } from '../src/index';
import { expect } from 'chai';

let devtronSW: ServiceWorkerMain | undefined;
let ipcEvents: IpcEventDataIndexed[] = [];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

  if (!devtronSW) console.warn('Devtron service worker not found');
  devtronSW?.ipc.on('devtron-ipc-events', (event, data) => {
    ipcEvents = data;
  });
}

function updateIpcEvents() {
  devtronSW?.send('devtron-get-ipc-events');
}

describe('Tracking IPC Events', () => {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (!mainWindow) throw new Error('Main window is not available');

  before(async () => {
    ipcMain.on('test-main-on', () => {});
    await delay(300);
    registerDevtronIpc();
  });

  before(async () => {
    await delay(300);
    mainWindow.webContents.send('test-renderer-on', 'arg1', 'arg2');
    mainWindow.webContents.send('test-renderer-once', 'arg1', 'arg2');
    await delay(300);
    updateIpcEvents();
    await delay(300);
    // console.log('IPC Events:', ipcEvents);
  });

  it('should track ipcRenderer.on', () => {
    const ev = ipcEvents.find(
      (e) =>
        e.direction === 'renderer-to-main' &&
        e.channel === 'test-main-on' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2',
    );
    expect(ev).to.exist;
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

  it('should track ipcRenderer.once', () => {
    const ev_on = ipcEvents.find(
      (e) =>
        e.direction === 'main-to-renderer' &&
        e.channel === 'test-renderer-once' &&
        Array.isArray(e.args) &&
        e.args[0] === 'arg1' &&
        e.args[1] === 'arg2' &&
        e.method === 'on',
    );

    const ev_removeListener = ipcEvents.find(
      (e) =>
        e.direction === 'renderer' &&
        e.channel === 'test-renderer-once' &&
        Array.isArray(e.args) &&
        e.args.length === 0 &&
        e.method === 'removeListener',
    );

    expect(ev_on, 'Expected an ipcRenderer.on event').to.exist;
    expect(ev_removeListener, 'Expected an ipcRenderer.removeListener event').to.exist;
  });
});
