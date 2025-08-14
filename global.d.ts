import type { IpcEventData, IpcEventDataIndexed } from './src/types/shared';

declare global {
  function addIpcEvent(data: IpcEventData): void;
  function returnIpcEvents(): IpcEventDataIndexed[];
}
export {};
