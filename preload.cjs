const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('memorialAPI', {
  getAll: () => ipcRenderer.invoke('memorial:getAll'),
  add: (memorial) => ipcRenderer.invoke('memorial:add', memorial),
  update: (id, data) => ipcRenderer.invoke('memorial:update', { id, data }),
  delete: (id) => ipcRenderer.invoke('memorial:delete', id),
  togglePin: (id) => ipcRenderer.invoke('memorial:togglePin', id),
  reorder: (ids) => ipcRenderer.invoke('memorial:reorder', ids),
  exportData: () => ipcRenderer.invoke('memorial:exportData'),
  importData: () => ipcRenderer.invoke('memorial:importData'),
});

contextBridge.exposeInMainWorld('widgetAPI', {
  openMain: () => ipcRenderer.invoke('widget:openMain'),
  move: (dx, dy) => ipcRenderer.invoke('widget:move', dx, dy),
  showWidget: () => ipcRenderer.invoke('widget:showWidget'),
  toggleWidget: () => ipcRenderer.invoke('widget:toggleWidget'),
  hideWidget: () => ipcRenderer.invoke('widget:hideWidget'),
  onRefresh: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('widget:refresh', handler);
    return () => ipcRenderer.removeListener('widget:refresh', handler);
  },
  onRestoreAll: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('widget:restoreAll', handler);
    return () => ipcRenderer.removeListener('widget:restoreAll', handler);
  },
});
