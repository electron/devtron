import type { MSG_TYPE } from '../common/constants';
/* ------------------ ELECTRON-PROCESS ------------------ */
export type Direction =
  | 'renderer-to-main'
  | 'main-to-renderer'
  | 'service-worker-to-main'
  | 'main-to-service-worker'
  | 'renderer'
  | 'main';

export type Channel = string;
export type UUID = string;

export type ServiceWorkerDetails = {
  serviceWorkerVersionId: number;
  serviceWorkerScope: string;
};

export interface IpcEventData {
  direction: Direction;
  channel: Channel;
  args: any[];
  timestamp: number;
  method?: string;
  serviceWorkerDetails?: ServiceWorkerDetails;
  responseTime?: number; // To track response time for `sendSync` and `invoke` methods
  uuid?: UUID; // UUID to match requests and responses (for `invoke` and `sendSync` methods on `ipcRenderer`)
}

export type LogLevelString = 'debug' | 'info' | 'warn' | 'error' | 'none';

export enum LogLevel {
  debug,
  info,
  warn,
  error,
  none,
}

export interface InstallOptions {
  /**
   * Sets the minimum log level for the logger.
   * All messages below the specified level will be ignored.
   *
   * Available levels:
   * - 'debug' — logs: debug, info, warn, error
   * - 'info'  — logs: info, warn, error
   * - 'warn'  — logs: warn, error
   * - 'error' — logs: error only
   * - 'none'  — disables all logging
   *
   * @default 'debug'
   */
  logLevel?: LogLevelString;
  /**
   * List of IPC channels that should be excluded from Devtron's payload wrapping.
   * Handlers for these channels will receive original arguments instead of wrapped payloads.
   * This is useful for libraries that register IPC handlers before devtron.install() is called.
   *
   * @example
   * ```ts
   * devtron.install({
   *   excludeChannels: ['bugsnag::renderer-to-main', 'bugsnag::renderer-to-main-sync']
   * });
   * ```
   */
  excludeChannels?: Channel[];
}

/* ------------------------------------------------------ */

/* ---------------------- EXTENSION --------------------- */
export type SerialNumber = number;

export interface IpcEventDataIndexed extends IpcEventData {
  serialNumber: SerialNumber;
  gotoSerialNumber?: SerialNumber; // For navigating to a specific event in the grid
}

export type MessagePanel =
  | { type: typeof MSG_TYPE.PONG }
  | { type: typeof MSG_TYPE.PING }
  | { type: typeof MSG_TYPE.GET_ALL_EVENTS }
  | { type: typeof MSG_TYPE.CLEAR_EVENTS }
  | { type: typeof MSG_TYPE.RENDER_EVENT; event: IpcEventDataIndexed };

export type MessageContentScript = {
  type: typeof MSG_TYPE.ADD_IPC_EVENT;
  event: IpcEventDataIndexed;
};
/* ------------------------------------------------------ */
