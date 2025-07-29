const { ipcRenderer } = require('electron');

ipcRenderer.on('test-renderer-on', () => {
  ipcRenderer.send('test-main-on', 'arg1', 'arg2');
});

ipcRenderer.once('test-renderer-once', () => {});
