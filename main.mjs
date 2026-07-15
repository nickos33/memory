import electron from 'electron';
const { app, BrowserWindow, ipcMain, dialog, Menu } = electron;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initNotifications, checkUpcoming } from './notifications.mjs';
import * as store from './store.mjs';
import { getLoginItemOptions, shouldOpenMainWindow } from './src/shared/startup-mode.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;
let widgetWindow;
let forceQuitting = false;

const WIDGET_CONFIG = path.join(app.getPath('userData'), 'widget-config.json');

function isTrustedRendererUrl(url) {
  try {
    const filePath = fileURLToPath(url);
    const publicRoot = path.join(__dirname, 'public') + path.sep;
    return filePath.startsWith(publicRoot);
  } catch (_) {
    return false;
  }
}

function assertTrustedSender(event) {
  const senderUrl = event.senderFrame?.url || '';
  if (!isTrustedRendererUrl(senderUrl)) throw new Error('拒绝来自未知页面的请求');
}

function trustedHandle(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedSender(event);
    return handler(...args);
  });
}

function loadWidgetConfig() {
  try {
    if (fs.existsSync(WIDGET_CONFIG)) return JSON.parse(fs.readFileSync(WIDGET_CONFIG, 'utf-8'));
  } catch (_) {}
  return { x: 20, y: 20, width: 260, height: 220, visible: true };
}

function saveWidgetConfig(cfg) {
  fs.writeFileSync(WIDGET_CONFIG, JSON.stringify(cfg, null, 2), 'utf-8');
}

function updateWidgetConfig(patch) {
  saveWidgetConfig({ ...loadWidgetConfig(), ...patch });
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
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });

  mainWindow.on('close', (event) => {
    if (!forceQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  mainWindow.show();
  mainWindow.focus();
  return mainWindow;
}

function createWidget(forceVisible) {
  const cfg = loadWidgetConfig();
  if (!cfg.visible && !forceVisible) return;

  if (forceVisible) {
    cfg.visible = true;
    saveWidgetConfig(cfg);
  }

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
      sandbox: true,
    },
  });

  widgetWindow.loadFile(path.join(__dirname, 'public', 'widget.html'));
  widgetWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  widgetWindow.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });
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
      { label: '打开主窗口', click: showMainWindow },
      { label: '恢复全部隐藏', click: () => { widgetWindow.webContents.send('widget:restoreAll'); } },
      { type: 'separator' },
      { label: '隐藏面板', click: () => {
        if (widgetWindow && !widgetWindow.isDestroyed()) {
          widgetWindow.hide();
          updateWidgetConfig({ visible: false });
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
  try {
    app.setLoginItemSettings(getLoginItemOptions());
  } catch (error) {
    console.error('注册开机启动失败:', error);
  }

  let loginSettings = {};
  try {
    loginSettings = app.getLoginItemSettings();
  } catch (error) {
    console.error('读取开机启动状态失败:', error);
  }

  if (shouldOpenMainWindow(loginSettings)) showMainWindow();
  createWidget(true);
  initNotifications(showMainWindow);
  checkUpcoming();

  app.on('activate', () => {
    showMainWindow();
  });
  app.on('before-quit', () => { forceQuitting = true; });
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
trustedHandle('widget:openMain', () => {
  showMainWindow();
});

trustedHandle('widget:move', (dx, dy) => {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) > 1000 || Math.abs(dy) > 1000) {
    throw new Error('无效的小组件移动距离');
  }
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    const [x, y] = widgetWindow.getPosition();
    widgetWindow.setPosition(x + dx, y + dy);
  }
});

trustedHandle('widget:showWidget', () => {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    createWidget(true);
  } else {
    widgetWindow.show();
    widgetWindow.focus();
    updateWidgetConfig({ visible: true });
  }
});

trustedHandle('widget:hideWidget', () => {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.hide();
    updateWidgetConfig({ visible: false });
  }
});

trustedHandle('widget:toggleWidget', () => {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    createWidget(true);
  } else if (widgetWindow.isVisible()) {
    widgetWindow.hide();
    updateWidgetConfig({ visible: false });
  } else {
    widgetWindow.show();
    widgetWindow.focus();
    updateWidgetConfig({ visible: true });
  }
});

// Memorial CRUD IPC
trustedHandle('memorial:getAll', () => store.getAll());
trustedHandle('memorial:add', (memorial) => {
  const result = store.add(memorial);
  notifyWidgetRefresh();
  return result;
});
trustedHandle('memorial:update', ({ id, data } = {}) => {
  const result = store.update(id, data);
  notifyWidgetRefresh();
  return result;
});
trustedHandle('memorial:delete', (id) => {
  const result = store.remove(id);
  notifyWidgetRefresh();
  return result;
});
trustedHandle('memorial:togglePin', (id) => {
  const result = store.togglePin(id);
  notifyWidgetRefresh();
  return result;
});
trustedHandle('memorial:reorder', (ids) => {
  const result = store.reorder(ids);
  notifyWidgetRefresh();
  return result;
});

trustedHandle('memorial:exportData', async () => {
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

trustedHandle('memorial:importData', async () => {
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
