import { EventEmitter } from 'node:events';
import { vi } from 'vitest';

export const DEVTRON_EXTENSION_URL_MOCK = 'chrome-extension://devtron-extenison/';
export const SOME_OTHER_SW_URL_MOCK = 'chrome-extension://some-other-extension/';
export const DEVTRON_EXTENSION_ID_MOCK = 'devtron-mock-extension-id';

export class ServiceWorkerMainMock extends EventEmitter {
  public scope: string;
  public versionId: number;
  public send = vi.fn();
  public startTask = vi.fn();
  public ipc = new EventEmitter();

  constructor(scope = 'mock-scope', versionId = 1) {
    super();
    this.scope = scope;
    this.versionId = versionId;
    // bind `once` so that `devtronSW.ipc.once` behaves correctly in tests
    this.ipc.once = this.ipc.once.bind(this.ipc);
  }
}

export class ServiceWorkersMock extends EventEmitter {
  private _workers: Record<number, { versionId: number; scope: string }> = {};
  private _instances: Record<number, ServiceWorkerMainMock> = {};

  constructor() {
    super();
    // populate with another worker (so that `registerServiceWorkerSendListener` can patch it)
    this._workers[1] = { versionId: 1, scope: SOME_OTHER_SW_URL_MOCK };
    this._instances[1] = new ServiceWorkerMainMock(SOME_OTHER_SW_URL_MOCK, 1);
  }

  public getAllRunning() {
    return { ...this._workers };
  }

  public getWorkerFromVersionID(id: number) {
    return this._instances[id];
  }

  async startWorkerForScope(scope: string) {
    // check if worker for this scope already exists
    const existingEntry = Object.values(this._workers).find((w) => w.scope === scope);
    if (existingEntry) return this._instances[existingEntry.versionId];

    const newId = Math.max(0, ...Object.keys(this._instances).map((k) => Number(k))) + 1;
    const sw = new ServiceWorkerMainMock(scope, newId);
    this._workers[newId] = { scope, versionId: newId };
    this._instances[newId] = sw;
    return sw;
  }

  removeListener(event: string, listener: (...args: any[]) => void) {
    return super.removeListener(event, listener);
  }
}

export class IPCMainMock extends EventEmitter {
  handle = vi.fn();
  handleOnce = vi.fn();
  removeHandler = vi.fn();
  send = vi.fn();
  // #EDIT: add remaining EventEmitter methods
}

export class SessionMock extends EventEmitter {
  private partition: string;
  serviceWorkers: ServiceWorkersMock;
  registerPreloadScript = vi.fn();
  extensions: {
    loadExtension: ReturnType<typeof vi.fn>;
  };

  constructor(partition: string) {
    super();
    this.partition = partition;
    this.serviceWorkers = new ServiceWorkersMock();

    this.extensions = {
      loadExtension: vi.fn(async (/* path: string, opts?: Electron.LoadExtensionOptions */) => {
        const extension = {
          id: DEVTRON_EXTENSION_ID_MOCK,
          url: DEVTRON_EXTENSION_URL_MOCK,
        };

        // simulate that loading the extension also starts its service worker
        await this.serviceWorkers.startWorkerForScope(DEVTRON_EXTENSION_URL_MOCK);

        return extension;
      }),
    };
  }
}

export const app = new EventEmitter() as Partial<Electron.App> & EventEmitter;
app.isReady = vi.fn().mockReturnValue(true);
app.on = app.on.bind(app);

const sessions: Record<string, SessionMock> = {};

export const session = {
  defaultSession: (() => {
    const def = new SessionMock('default');
    sessions['default'] = def;

    app.emit('session-created', def);

    return def;
  })(),

  fromPartition: vi.fn((partition: string) => {
    if (!sessions[partition]) {
      const newSession = new SessionMock(partition);
      sessions[partition] = newSession;

      // emit 'session-created' event on app when a new session is created
      app.emit('session-created', newSession);
    }
    return sessions[partition];
  }),
};

export const ipcMain = new IPCMainMock();

const electronMock = {
  ipcMain,
  session,
  app,
};

export default electronMock;
