import electron from 'electron';
const { app, BrowserWindow, ipcMain, dialog, Menu } = electron;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initNotifications, checkUpcoming } from './notifications.mjs';
import * as store from './store.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let widgetWindow;
let forceQuitting = false;

const WIDGET_CONFIG = path.join(app.getPath('userData'), 'widget-config.json');

function loadWidgetConfig() {
  try {
    if (fs.existsSync(WIDGET_CONFIG)) return JSON.parse(fs.readFileSync(WIDGET_CONFIG, 'utf-8'));
  } catch (_) {}
  return { x: 20, y: 20, width: 260, height: 220, visible: true };
}

function saveWidgetConfig(cfg) {
  fs.writeFileSync(WIDGET_CONFIG, JSON.stringify(cfg, null, 2), 'utf-8');
}

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

function createWidget(forceVisible) {
  const cfg = loadWidgetConfig();
  if (!cfg.visible && !forceVisible) return;

  if (forceVisible) cfg.visible = true;

  widgetWindow = new BrowserWindow({
    x: cfg.x,
    y: cfg.y,
    width: cfg.width || 260,
    height: cfg.height || 190,
    minWidth: 200,
    minHeight: 130,
    maxWidth: 400,
    maxHeight: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: true,
    skipTaskbar: true,
    titleBarStyle: 'hidden',
    movable: false,
    closable: false,
    minimizable: false,
    maximizable: false,
    trafficLightPosition: { x: -100, y: -100 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  widgetWindow.loadFile(path.join(__dirname, 'public', 'widget.html'));
  widgetWindow.setVisibleOnAllWorkspaces(true);
  widgetWindow.setAlwaysOnTop(true, 'floating');

  widgetWindow.on('resize', () => {
    const [w, h] = widgetWindow.getSize();
    const [x, y] = widgetWindow.getPosition();
    saveWidgetConfig({ x, y, width: w, height: h, visible: true });
  });

  widgetWindow.on('moved', () => {
    const [x, y] = widgetWindow.getPosition();
    const [w, h] = widgetWindow.getSize();
    saveWidgetConfig({ x, y, width: w, height: h, visible: true });
  });

  // Right-click context menu
  widgetWindow.webContents.on('context-menu', () => {
    Menu.buildFromTemplate([
      { label: '打开主窗口', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { label: '恢复全部隐藏', click: () => { widgetWindow.webContents.send('widget:restoreAll'); } },
      { type: 'separator' },
      { label: '隐藏面板', click: () => {
        if (widgetWindow && !widgetWindow.isDestroyed()) {
          widgetWindow.hide();
        }
      }},
      { type: 'separator' },
      { label: '退出应用', click: () => { app.quit(); } },
    ]).popup();
  });

  widgetWindow.on('closed', () => { widgetWindow = null; });
}

function notifyWidgetRefresh() {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.webContents.send('widget:refresh');
  }
}

app.whenReady().then(() => {
  createWindow();
  createWidget();
  initNotifications(mainWindow);
  checkUpcoming();

  try { app.setLoginItemSettings({ openAtLogin: true }); } catch (_) {}

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  app.on('before-quit', () => { forceQuitting = true; });

  mainWindow.on('close', (e) => {
    if (!forceQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.destroy();
    widgetWindow = null;
  }
});

// Widget IPC
ipcMain.handle('widget:openMain', () => {
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
});

ipcMain.handle('widget:move', (_event, dx, dy) => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    const [x, y] = widgetWindow.getPosition();
    widgetWindow.setPosition(x + dx, y + dy);
  }
});

ipcMain.handle('widget:showWidget', () => {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    createWidget(true);
  } else {
    widgetWindow.show();
    widgetWindow.focus();
  }
});

ipcMain.handle('widget:hideWidget', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.hide();
  }
});

ipcMain.handle('widget:toggleWidget', () => {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    createWidget(true);
  } else if (widgetWindow.isVisible()) {
    widgetWindow.hide();
  } else {
    widgetWindow.show();
    widgetWindow.focus();
  }
});

// Memorial CRUD IPC
ipcMain.handle('memorial:getAll', () => store.getAll());
ipcMain.handle('memorial:add', (_event, memorial) => {
  const result = store.add(memorial);
  notifyWidgetRefresh();
  return result;
});
ipcMain.handle('memorial:update', (_event, { id, data }) => {
  const result = store.update(id, data);
  notifyWidgetRefresh();
  return result;
});
ipcMain.handle('memorial:delete', (_event, id) => {
  const result = store.remove(id);
  notifyWidgetRefresh();
  return result;
});
ipcMain.handle('memorial:togglePin', (_event, id) => store.togglePin(id));
ipcMain.handle('memorial:reorder', (_event, ids) => store.reorder(ids));

ipcMain.handle('memorial:exportData', async () => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: '导出纪念日数据',
    defaultPath: `memorials-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (filePath) {
    fs.writeFileSync(filePath, store.exportData(), 'utf-8');
    return true;
  }
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
    const count = store.importData(jsonStr);
    notifyWidgetRefresh();
    return count;
  }
  return 0;
});
