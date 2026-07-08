import electron from 'electron/main';
import path from 'path';
import { fileURLToPath } from 'url';
import { initNotifications, checkUpcoming } from './notifications.mjs';
import * as store from './store.mjs';

const { app, BrowserWindow, ipcMain } = electron;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 600,
    minHeight: 400,
    title: '纪念日提醒',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  initNotifications(mainWindow);
  checkUpcoming();

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
ipcMain.handle('memorial:delete', (_event, id) => store.delete(id));
ipcMain.handle('memorial:togglePin', (_event, id) => store.togglePin(id));
