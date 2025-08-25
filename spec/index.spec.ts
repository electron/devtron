import type { ServiceWorkerMainMock, SessionMock } from './mocks/electron';
import electronMock, { DEVTRON_EXTENSION_URL_MOCK, SOME_OTHER_SW_URL_MOCK } from './mocks/electron';
import { beforeAll, vi } from 'vitest';
import { describe, it, expect } from 'vitest';
import type { IpcEventData } from '../src/types/shared';
import { devtron } from '../src/index';

vi.mock('electron', () => import('./mocks/electron'));

vi.mock('node:module', () => ({
  createRequire: () => ({
    resolve: (path: string) => {
      return path;
    },
  }),
}));

const { session, ipcMain } = electronMock;

describe('devtron.install()', () => {
  beforeAll(async () => {
    // Install devtron twice to later test that it doesn't load multiple times
    await devtron.install();
  });

  describe.each([
    { name: 'defaultSession', sessionFactory: () => session.defaultSession },
    {
      name: 'newSession',
      sessionFactory: () => session.fromPartition('persist:devtron-test-session'),
    },
  ])('on $name', ({ sessionFactory: getSes }) => {
    let devtronSW: ServiceWorkerMainMock | null;
    let ses: SessionMock;

    const getServiceWorkerByScope = (scope: string) => {
      const allWorkers = ses.serviceWorkers.getAllRunning();
      const worker = Object.values(allWorkers).find((w) => w.scope === scope);

      if (worker) return ses.serviceWorkers.getWorkerFromVersionID(worker.versionId);
      return null;
    };

    beforeAll(async () => {
      ses = getSes();
      devtronSW = getServiceWorkerByScope(DEVTRON_EXTENSION_URL_MOCK);
    });

    it('loads the devtron extension', () => {
      expect(ses.extensions.loadExtension).toHaveBeenCalledWith(
        expect.any(String), // extension path
        expect.objectContaining({ allowFileAccess: true }),
      );
    });

    it('should not load the devtron extension multiple times', async () => {
      await devtron.install();
      expect(ses.extensions.loadExtension).toBeCalledTimes(1);
    });

    it('registers the service worker preload script', () => {
      expect(ses.registerPreloadScript).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: expect.any(String),
          type: 'service-worker',
          id: expect.any(String),
        }),
      );
    });

    it('registers the renderer preload script', () => {
      expect(ses.registerPreloadScript).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: expect.any(String),
          type: 'frame',
          id: expect.any(String),
        }),
      );
    });

    it('starts the devtron service worker', () => {
      expect(devtronSW).toBeDefined();
    });

    describe('tracks IPC events', () => {
      const sessionEventNames = ['-ipc-message', '-ipc-invoke', '-ipc-message-sync'];

      describe.each(sessionEventNames)('event: %s', (eventName) => {
        it(`tracks renderer-to-main IPC for ${eventName}`, () => {
          // simulate the event
          ses.emit(eventName, { type: 'frame' }, 'my-channel', ['arg1', 'arg2']);

          expect(devtronSW?.send).toBeCalledTimes(1);
          expect(devtronSW?.send).toHaveBeenCalledWith(
            'devtron-render-event',
            expect.objectContaining({
              direction: 'renderer-to-main',
              channel: 'my-channel',
              args: ['arg1', 'arg2'],
              timestamp: expect.any(Number),
              serviceWorkerDetails: undefined,
            } as IpcEventData),
          );
          devtronSW?.send.mockClear();
        });

        it(`tracks service-worker-to-main IPC for ${eventName}`, () => {
          ses.emit(eventName, { type: 'service-worker' }, 'sw-channel', ['arg1', 'arg2']);

          expect(devtronSW?.send).toBeCalledTimes(1);
          expect(devtronSW?.send).toHaveBeenCalledWith(
            'devtron-render-event',
            expect.objectContaining({
              direction: 'service-worker-to-main',
              channel: 'sw-channel',
              args: ['arg1', 'arg2'],
              timestamp: expect.any(Number),
              serviceWorkerDetails: undefined,
            } as IpcEventData),
          );
          devtronSW?.send.mockClear();
        });

        it(`tracks renderer-to-main IPC event including UUID for ${eventName}`, () => {
          // simulate the event
          ses.emit(eventName, { type: 'frame' }, 'my-channel-uuid', [
            {
              __uuid__devtron: '1234-5678-uuid',
              args: ['arg1', 'arg2'],
            },
          ]);

          expect(devtronSW?.send).toBeCalledTimes(1);
          expect(devtronSW?.send).toHaveBeenCalledWith(
            'devtron-render-event',
            expect.objectContaining({
              direction: 'renderer-to-main',
              channel: 'my-channel-uuid',
              args: ['arg1', 'arg2'],
              timestamp: expect.any(Number),
              serviceWorkerDetails: undefined,
            } as IpcEventData),
          );
          devtronSW?.send.mockClear();
        });

        it(`tracks service-worker-to-main IPC including UUID for ${eventName}`, () => {
          ses.emit(eventName, { type: 'service-worker' }, 'sw-channel-uuid', [
            {
              __uuid__devtron: '1234-5678-uuid',
              args: ['arg1', 'arg2'],
            },
          ]);

          expect(devtronSW?.send).toBeCalledTimes(1);
          expect(devtronSW?.send).toHaveBeenCalledWith(
            'devtron-render-event',
            expect.objectContaining({
              direction: 'service-worker-to-main',
              channel: 'sw-channel-uuid',
              args: ['arg1', 'arg2'],
              timestamp: expect.any(Number),
              serviceWorkerDetails: undefined,
            } as IpcEventData),
          );
          devtronSW?.send.mockClear();
        });

        it("should not track IPC events sent from Devtron's Service Worker", () => {
          // When main process receives an IPC event from Devtron's SW, it should not track it
          // Simulate the event being sent from the SW
          ses.emit(eventName, { type: 'service-worker' }, 'devtron-ipc-events', ['payload']);
          expect(devtronSW?.send).not.toHaveBeenCalled();
          devtronSW?.send.mockClear();
        });
      });

      it('tracks main-to-service-worker IPC', () => {
        const sw = getServiceWorkerByScope(SOME_OTHER_SW_URL_MOCK);
        sw?.send('main-to-sw-channel', 'arg1', 'arg2');

        expect(devtronSW?.send).toBeCalledTimes(1);
        expect(devtronSW?.send).toHaveBeenCalledWith(
          'devtron-render-event',
          expect.objectContaining({
            direction: 'main-to-service-worker',
            channel: 'main-to-sw-channel',
            args: ['arg1', 'arg2'],
            timestamp: expect.any(Number),
            serviceWorkerDetails: expect.objectContaining({
              serviceWorkerVersionId: sw?.versionId,
              serviceWorkerScope: SOME_OTHER_SW_URL_MOCK,
            }),
          } as IpcEventData),
        );
        devtronSW?.send.mockClear();
      });

      it("should not track main-to-service-worker IPC sent to Devtron's own service worker", () => {
        devtronSW?.send('main-to-sw-channel', 'arg1', 'arg2');

        expect(devtronSW?.send).toBeCalledTimes(1);
        expect(devtronSW?.send.mock.calls.some((call) => call[0] === 'devtron-render-event')).toBe(
          false,
        );
        devtronSW?.send.mockClear();
      });

      describe('ipcMain tracking', () => {
        it("'on' should clean UUID wrapper if present and call the original listener", () => {
          const originalListener = vi.fn();
          ipcMain.on('ping', originalListener);

          ipcMain.emit(
            'ping',
            { some: 'event' }, // event object
            { __uuid__devtron: '1234-5678-uuid', args: ['arg1', 'arg2'] }, // payload
          );

          // Expect the supplied listener to have been called with cleaned args
          expect(originalListener).toBeCalledTimes(1);
          expect(originalListener).toHaveBeenCalledWith(
            expect.any(Object), // event object
            'arg1',
            'arg2',
          );

          ipcMain.removeAllListeners('ping');

          expect(devtronSW?.send).toBeCalledTimes(1);
          devtronSW?.send.mockClear();
        });

        it("'once' should clean UUID wrapper if present and also track its removal", () => {
          const originalListener = vi.fn();

          // `once` is tracked as `on` + `removeListener`
          const onSpy = vi.spyOn(ipcMain, 'on');

          ipcMain.once('once-event', originalListener);

          ipcMain.emit(
            'once-event',
            { some: 'event' },
            { __uuid__devtron: '1234-5678-uuid', args: ['arg1', 'arg2'] },
          );

          expect(onSpy).toHaveBeenCalledWith('once-event', expect.any(Function));

          expect(originalListener).toHaveBeenCalledTimes(1);
          expect(originalListener).toHaveBeenCalledWith(expect.any(Object), 'arg1', 'arg2');

          expect(devtronSW?.send).toHaveBeenCalledWith(
            'devtron-render-event',
            expect.objectContaining({
              direction: 'main',
              channel: 'once-event',
              args: [],
              timestamp: expect.any(Number),
              method: 'removeListener',
              serviceWorkerDetails: undefined,
            } as IpcEventData),
          );
          devtronSW?.send.mockClear();
        });

        it("'removeListener' removes the specified listener for a specified channel and tracks this event", () => {
          const listener = vi.fn();

          ipcMain.on('some-channel', listener); // add the listener

          expect(ipcMain.listenerCount('some-channel')).toBe(1);

          ipcMain.removeListener('some-channel', listener);
          expect(ipcMain.listenerCount('some-channel')).toBe(0);

          expect(devtronSW?.send).toBeCalledTimes(1);
          devtronSW?.send.mockClear();
        });

        it("'removeAllListeners' removes all listeners for a specified channel and tracks this event", () => {
          // add multiple listeners
          const listener1 = vi.fn();
          const listener2 = vi.fn();
          ipcMain.on('some-channel', listener1);
          ipcMain.on('some-channel', listener2);

          expect(ipcMain.listenerCount('some-channel')).toBe(2);

          ipcMain.removeAllListeners('some-channel');
          expect(ipcMain.listenerCount('some-channel')).toBe(0);

          expect(devtronSW?.send).toBeCalledTimes(1);
          devtronSW?.send.mockClear();
        });
      });
    });
  });
});
