const { ipcRenderer } = require('electron');

const listener = () => {};

ipcRenderer.on('test-renderer-on', () => {});
ipcRenderer.addListener('test-renderer-addListener', () => {});
ipcRenderer.once('test-renderer-once', () => {});

ipcRenderer.on('test-renderer-off', listener);
ipcRenderer.on('test-renderer-removeListener', listener);
ipcRenderer.on('test-renderer-removeAllListeners', listener);

ipcRenderer.on('request-ipc-renderer-events', async () => {
  ipcRenderer.off('test-renderer-off', listener);
  ipcRenderer.removeListener('test-renderer-removeListener', listener);
  ipcRenderer.removeAllListeners('test-renderer-removeAllListeners');

  ipcRenderer.send('test-main-on', 'arg1', 'arg2');
  ipcRenderer.send('test-main-once', 'arg1', 'arg2');
  await ipcRenderer.invoke('test-main-handle', 'arg1', 'arg2');
  await ipcRenderer.invoke('test-main-handle-once', 'arg1', 'arg2');
  ipcRenderer.sendSync('test-main-sendSync', 'arg1', 'arg2');
});
