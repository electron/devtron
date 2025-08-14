import { contextBridge, ipcRenderer } from 'electron';

ipcRenderer.on('devtron-render-event', (event, data) => {
  contextBridge.executeInMainWorld({
    func: (data) => {
      addIpcEvent(data); // 'addIpcEvent' is available in the background service-worker
    },
    args: [data],
  });
});

ipcRenderer.on('devtron-get-ipc-events', () => {
  const ipcEvents = contextBridge.executeInMainWorld({
    func: () => {
      return returnIpcEvents(); // 'returnIpcEvents' is available in the background service-worker
    },
    args: [],
  });
  ipcRenderer.send('devtron-ipc-events', ipcEvents);
});
