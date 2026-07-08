const Module = require('module');
const path = require('path');
const fs = require('fs');

// In Electron 28+, the 'electron' npm package shadows the built-in 'electron' module.
// The npm package's index.js returns a PATH STRING (for the CLI), not the module.
// We need to bypass this and get the REAL electron module.
//
// Strategy: remove node_modules/electron from the require search path so
// it falls through to the built-in electron module.
let electron;
try {
  // Try direct resolve to the built-in
  const origResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function(request, parent, isMain, options) {
    if (request === 'electron') {
      // Bypass the node_modules shadow and let the built-in resolve
      const fakeParent = { id: '/', filename: '/', paths: [] };
      return origResolveFilename.call(this, request, fakeParent, isMain, options);
    }
    return origResolveFilename.apply(this, arguments);
  };
  electron = require('electron');
} catch (e) {
  // If that doesn't work, try the shadow (will be a string path, not the module)
  const raw = require('electron');
  if (typeof raw === 'string') {
    console.error('FATAL: Cannot load electron API. The npm electron package shadows the built-in module.');
    console.error('Run: rm -rf node_modules/electron && npm install electron@28.2.0 --save-dev');
    process.exit(1);
  }
  electron = raw;
}

const { app, BrowserWindow, ipcMain, dialog } = electron;
const { initNotifications, checkUpcoming } = require('./notifications.cjs');
const store = require('./store.cjs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 600,
    minHeight: 400,
    title: '纪念日提醒',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  initNotifications(mainWindow);
  checkUpcoming();
  try { app.setLoginItemSettings({ openAtLogin: true }); } catch (_) {}
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('memorial:getAll', () => store.getAll());
ipcMain.handle('memorial:add', (_event, memorial) => store.add(memorial));
ipcMain.handle('memorial:update', (_event, { id, data }) => store.update(id, data));
ipcMain.handle('memorial:delete', (_event, id) => store.remove(id));
ipcMain.handle('memorial:togglePin', (_event, id) => store.togglePin(id));
ipcMain.handle('memorial:reorder', (_event, ids) => store.reorder(ids));

ipcMain.handle('memorial:exportData', async () => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '导出纪念日数据',
    defaultPath: `memorials-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (filePath) { fs.writeFileSync(filePath, store.exportData(), 'utf-8'); return true; }
  return false;
});

ipcMain.handle('memorial:importData', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: '导入纪念日数据',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (filePaths && filePaths[0]) {
    const jsonStr = fs.readFileSync(filePaths[0], 'utf-8');
    return store.importData(jsonStr);
  }
  return 0;
});
