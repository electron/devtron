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

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

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
  logLevel?: LogLevel;
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
