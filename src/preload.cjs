const { contextBridge, ipcRenderer } = require('electron/main');

contextBridge.exposeInMainWorld('memorialAPI', {
  getAll: () => ipcRenderer.invoke('memorial:getAll'),
  add: (memorial) => ipcRenderer.invoke('memorial:add', memorial),
  update: (id, data) => ipcRenderer.invoke('memorial:update', { id, data }),
  delete: (id) => ipcRenderer.invoke('memorial:delete', id),
  togglePin: (id) => ipcRenderer.invoke('memorial:togglePin', id),
});
