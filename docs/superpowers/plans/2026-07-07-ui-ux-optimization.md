# UI/UX 全量优化 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 重构纪念日桌面应用 — 清蓝渐变+毛玻璃视觉风格、hover隐藏菜单、倒计时、拖拽排序(dnd-kit)、农历支持、分类标签、数据导出导入

**架构：** 主进程(CommonJS .cjs) + preload(IPC桥接) + webpack构建React渲染进程。数据层扩展现有JSON文件存储以支持 order/isLunar/tags 字段。拖拽排序通过 dnd-kit 在渲染层实现，排序结果通过 IPC 持久化。农历通过 lunar-typescript 在前端计算。

**技术栈：** Electron 28, React 18, webpack 5, @dnd-kit/core+sortable, lunar-typescript, electron-store(现有), node-cron(现有)

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `store.cjs` | 数据持久化: JSON 读写, 增删改查(+order/tags/isLunar), 导出导入 |
| `main.cjs` | Electron 主进程: 窗口创建, IPC 注册, 文件对话框 |
| `preload.cjs` | 上下文桥接: 暴露安全 API 给渲染进程 |
| `notifications.cjs` | 定时检查+系统通知(现有,微调农历生日支持) |
| `public/index.html` | HTML 入口(可能需调整) |
| `src/renderer/index.js` | React 挂载点(不变) |
| `src/renderer/App.js` | 根组件: 状态管理, 排序, 过滤, 拖拽容器 |
| `src/renderer/App.css` | 全局样式: 全面重写(渐变/毛玻璃/动效) |
| `src/renderer/components/Card.js` | 卡片: hover菜单, 倒计时, 农历日期, 标签chip |
| `src/renderer/components/CardList.js` | 列表 + dnd-kit 拖拽排序容器 |
| `src/renderer/components/AddEditForm.js` | 表单: 新增农历开关, 标签选择 |
| `src/renderer/components/SearchBar.js` | 搜索 + 标签筛选chip组 |
| `src/renderer/components/ConfirmDialog.js` | 删除确认弹窗(样式更新) |
| `src/renderer/components/ExportImportBar.js` | **新建**: 导出/导入按钮栏 |
| `src/renderer/utils/helpers.js` | 工具函数: 格式化日期/倒计时/农历 |

---

### 任务 1：安装依赖 + 验证基线

**文件：**
- 修改: `package.json`

- [ ] **步骤 1: 安装现有依赖**

```bash
cd /Users/nickos_mac/Desktop/纪念日 && npm install
```

- [ ] **步骤 2: 添加新依赖**

```bash
cd /Users/nickos_mac/Desktop/纪念日 && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities lunar-typescript
```

- [ ] **步骤 3: 验证依赖安装**

```bash
ls node_modules/@dnd-kit/core/package.json node_modules/lunar-typescript/package.json && echo "OK"
```

- [ ] **步骤 4: 读取现有 store.cjs 和 notifications.cjs 确认状态**

```bash
ls -la /Users/nickos_mac/Desktop/纪念日/store.cjs /Users/nickos_mac/Desktop/纪念日/notifications.cjs
```

- [ ] **步骤 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install dependencies (@dnd-kit, lunar-typescript)"
```

---

### 任务 2：扩展数据模型 — store.cjs

**文件：**
- 修改: `store.cjs`

- [ ] **步骤 1: 读取当前 store.cjs 内容**

使用 Read 工具读取 `/Users/nickos_mac/Desktop/纪念日/store.cjs`。

- [ ] **步骤 2: 重写 store.cjs 支持新字段 + 导出导入**

将文件内容替换为：

```js
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

let Lunar;
try { Lunar = require('lunar-typescript').Lunar; } catch (_) {}

function getDataFile() {
  return path.join(app.getPath('userData'), 'memorials.json');
}

function read() {
  try {
    const file = getDataFile();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return data.map((m) => ({
        order: 0,
        isLunar: false,
        tags: [],
        ...m,
      }));
    }
  } catch (_) {}
  return [];
}

function write(data) {
  fs.writeFileSync(getDataFile(), JSON.stringify(data, null, 2), 'utf-8');
}

function computeLunarNextDate(dateStr) {
  if (!Lunar || !dateStr) return null;
  try {
    const d = new Date(dateStr);
    const lunar = Lunar.fromDate(d);
    const today = new Date();
    const thisYear = Lunar.fromDate(today).getYear();
    let next = Lunar.fromYmd(thisYear, lunar.getMonth(), lunar.getDay());
    let solar = next.getSolar();
    let nextDate = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
    if (nextDate < new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) {
      const nextYear = Lunar.fromYmd(thisYear + 1, lunar.getMonth(), lunar.getDay());
      solar = nextYear.getSolar();
      nextDate = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
    }
    return nextDate.toISOString().slice(0, 10);
  } catch (_) {
    return null;
  }
}

function getAll() {
  const data = read();
  return data.map((m) => {
    if (m.isLunar) {
      m._lunarNextDate = computeLunarNextDate(m.date);
    }
    return m;
  });
}

function add(memorial) {
  const list = read();
  const maxOrder = list.reduce((max, m) => Math.max(max, m.order || 0), 0);
  const newItem = {
    ...memorial,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    pinned: false,
    order: maxOrder + 1,
    isLunar: memorial.isLunar || false,
    tags: memorial.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (newItem.isLunar) {
    newItem._lunarNextDate = computeLunarNextDate(newItem.date);
  }
  list.push(newItem);
  write(list);
  return newItem;
}

function update(id, data) {
  const list = read();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) throw new Error('未找到该纪念日');
  list[index] = { ...list[index], ...data, updatedAt: new Date().toISOString() };
  if (list[index].isLunar) {
    list[index]._lunarNextDate = computeLunarNextDate(list[index].date);
  }
  write(list);
  return list[index];
}

function remove(id) {
  const list = read();
  write(list.filter((m) => m.id !== id));
  return true;
}

function togglePin(id) {
  const list = read();
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) throw new Error('未找到该纪念日');
  list[index].pinned = !list[index].pinned;
  list[index].updatedAt = new Date().toISOString();
  write(list);
  return list[index];
}

function reorder(orderedIds) {
  const list = read();
  const map = new Map(list.map((m) => [m.id, m]));
  orderedIds.forEach((id, index) => {
    if (map.has(id)) map.get(id).order = index;
  });
  write(list);
  return list;
}

function exportData() {
  return JSON.stringify(read(), null, 2);
}

function importData(jsonStr) {
  const incoming = JSON.parse(jsonStr);
  if (!Array.isArray(incoming)) throw new Error('无效的备份文件格式');
  const existing = read();
  const existingIds = new Set(existing.map((m) => m.id));
  const newItems = incoming.filter((m) => !existingIds.has(m.id));
  write([...existing, ...newItems]);
  return newItems.length;
}

module.exports = { getAll, add, update, remove, togglePin, reorder, exportData, importData };
```

- [ ] **步骤 3: 验证语法**

```bash
node -c /Users/nickos_mac/Desktop/纪念日/store.cjs && echo "Syntax OK"
```

- [ ] **步骤 4: Commit**

```bash
git add store.cjs
git commit -m "feat: extend data model with order, isLunar, tags + export/import"
```

---

### 任务 3：更新主进程 + Preload — main.cjs + preload.cjs

**文件：**
- 修改: `main.cjs`
- 修改: `preload.cjs`

- [ ] **步骤 1: 重写 preload.cjs 暴露所有 API**

将 `/Users/nickos_mac/Desktop/纪念日/preload.cjs` 替换为：

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('memorialAPI', {
  getAll: () => ipcRenderer.invoke('memorial:getAll'),
  add: (memorial) => ipcRenderer.invoke('memorial:add', memorial),
  update: (id, data) => ipcRenderer.invoke('memorial:update', { id, data }),
  delete: (id) => ipcRenderer.invoke('memorial:delete', id),
  togglePin: (id) => ipcRenderer.invoke('memorial:togglePin', id),
  reorder: (ids) => ipcRenderer.invoke('memorial:reorder', ids),
  exportData: () => ipcRenderer.invoke('memorial:exportData'),
  importData: (jsonStr) => ipcRenderer.invoke('memorial:importData', jsonStr),
});
```

- [ ] **步骤 2: 重写 main.cjs 注册所有 IPC 通道**

将 `/Users/nickos_mac/Desktop/纪念日/main.cjs` 替换为：

```js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
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
    return store.importData(jsonStr);
  }
  return 0;
});
```

- [ ] **步骤 3: 验证语法**

```bash
node -c /Users/nickos_mac/Desktop/纪念日/main.cjs && node -c /Users/nickos_mac/Desktop/纪念日/preload.cjs && echo "Syntax OK"
```

- [ ] **步骤 4: Commit**

```bash
git add main.cjs preload.cjs
git commit -m "feat: add IPC channels for reorder, export, import"
```

---

### 任务 4：更新工具函数 — helpers.js

**文件：**
- 修改: `src/renderer/utils/helpers.js`

- [ ] **步骤 1: 重写 helpers.js 增加倒计时和农历格式化**

将 `/Users/nickos_mac/Desktop/纪念日/src/renderer/utils/helpers.js` 替换为：

```js
import { Lunar, Solar } from 'lunar-typescript';

export function formatDate(dateStr, isLunar) {
  if (!dateStr) return '';
  if (isLunar) {
    const d = new Date(dateStr);
    const lunar = Lunar.fromDate(d);
    return `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
  }
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
}

export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export function daysUntilText(dateStr) {
  const diff = daysUntil(dateStr);
  if (diff === 0) return { text: '今天', isSoon: true };
  if (diff === 1) return { text: '明天', isSoon: true };
  if (diff < 0) return { text: `${Math.abs(diff)}天前`, isSoon: false };
  return { text: `距今天 ${diff} 天`, isSoon: false };
}

export function getNextLunarBirthday(lunarMonth, lunarDay) {
  const today = new Date();
  const thisYear = Lunar.fromDate(today).getYear();
  const lunar = Lunar.fromYmd(thisYear, lunarMonth, lunarDay);
  let solar = lunar.getSolar();
  let next = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)) {
    const nextLunar = Lunar.fromYmd(thisYear + 1, lunarMonth, lunarDay);
    solar = nextLunar.getSolar();
    next = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
  }
  return next.toISOString().slice(0, 10);
}

export const TAG_OPTIONS = ['家庭', '工作', '朋友', '恋爱', '重要'];

export function filterByTags(items, selectedTags) {
  if (!selectedTags || selectedTags.length === 0) return items;
  return items.filter((item) => {
    if (!item.tags || item.tags.length === 0) return false;
    return selectedTags.some((t) => item.tags.includes(t));
  });
}
```

- [ ] **步骤 2: 验证语法**

```bash
node -e "require('@babel/core').parseSync(require('fs').readFileSync('/Users/nickos_mac/Desktop/纪念日/src/renderer/utils/helpers.js','utf8'),{presets:['@babel/preset-env','@babel/preset-react']})" && echo "Syntax OK"
```

- [ ] **步骤 3: Commit**

```bash
git add src/renderer/utils/helpers.js
git commit -m "feat: add countdown formatting, lunar date helpers, tag constants"
```

---

### 任务 5：全面重写 CSS 样式 — App.css

**文件：**
- 修改: `src/renderer/App.css`

- [ ] **步骤 1: 将 App.css 替换为全新样式**

```css
/* ===== CSS Variables: Clear Blue Glass Theme ===== */
:root {
  --bg-gradient: linear-gradient(180deg, #E6EDF5 0%, #EEF2F8 40%, #EDF2F7 100%);
  --blue-500: #007AFF;
  --blue-600: #0066D6;
  --blue-bg: rgba(0, 122, 255, 0.06);
  --blue-border: rgba(0, 122, 255, 0.12);
  --red-500: #FF3B30;
  --red-bg: rgba(255, 59, 48, 0.04);
  --red-border: rgba(255, 59, 48, 0.1);
  --text-primary: #3A5068;
  --text-secondary: #8A9EB0;
  --text-tertiary: #A0B5C8;
  --glass-strong: rgba(255, 255, 255, 0.72);
  --glass-medium: rgba(255, 255, 255, 0.65);
  --glass-light: rgba(255, 255, 255, 0.5);
  --glass-border-strong: rgba(255, 255, 255, 0.85);
  --glass-border-medium: rgba(255, 255, 255, 0.7);
  --blur: blur(14px);
  --radius: 16px;
  --radius-sm: 14px;
  --radius-xs: 8px;
  --shadow-card: 0 1px 4px rgba(0, 0, 0, 0.03);
  --shadow-btn: 0 2px 8px rgba(0, 122, 255, 0.25);
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
  background: var(--bg-gradient);
  color: var(--text-primary);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

/* ===== App Layout ===== */
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 36px 20px 40px;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.app-header h1 {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: 1px;
}

/* ===== Buttons ===== */
.btn-add {
  background: var(--blue-500);
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-btn);
  transition: background var(--transition-fast), transform 0.1s;
}
.btn-add:hover { background: var(--blue-600); }
.btn-add:active { transform: scale(0.97); }

.btn-edit {
  background: var(--blue-bg);
  border: 1px solid var(--blue-border);
  color: var(--blue-500);
  padding: 5px 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-edit:hover { background: rgba(0, 122, 255, 0.1); }

.btn-delete {
  background: var(--red-bg);
  border: 1px solid var(--red-border);
  color: var(--red-500);
  padding: 5px 12px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-delete:hover { background: rgba(255, 59, 48, 0.08); }

.btn-pin {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  opacity: 0.3;
  transition: opacity var(--transition-fast), transform 0.15s;
}
.btn-pin:hover { opacity: 0.7; transform: scale(1.15); }
.btn-pin.pinned { opacity: 1; }

.btn-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-secondary);
  border: none;
  padding: 10px 20px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-cancel:hover { background: rgba(0, 0, 0, 0.08); }

.btn-save {
  background: var(--blue-500);
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), transform 0.1s;
}
.btn-save:hover { background: var(--blue-600); }
.btn-save:active { transform: scale(0.97); }

.btn-delete-confirm {
  background: var(--red-500);
  color: #fff;
  border: none;
  padding: 10px 24px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-delete-confirm:hover { background: #D32F2F; }

/* ===== Search Bar ===== */
.search-bar {
  display: flex;
  align-items: center;
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  background: var(--glass-medium);
  border: 1px solid var(--glass-border-medium);
  border-radius: var(--radius-sm);
  padding: 0 16px;
  margin-bottom: 16px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.search-bar:focus-within {
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}
.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  padding: 11px 10px;
  font-size: 14px;
  background: transparent;
  color: var(--text-primary);
}
.search-bar input::placeholder { color: var(--text-tertiary); }
.search-icon { font-size: 15px; margin-right: 4px; opacity: 0.5; }
.search-clear {
  background: none;
  border: none;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
}
.search-clear:hover { color: var(--text-primary); }

/* ===== Tag Filter ===== */
.tag-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.tag-filter-chip {
  padding: 5px 14px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  background: var(--glass-medium);
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.tag-filter-chip:hover {
  border-color: var(--blue-border);
  color: var(--blue-500);
}
.tag-filter-chip.active {
  background: var(--blue-500);
  color: #fff;
  border-color: var(--blue-500);
}

/* ===== Card List ===== */
.card-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-list.dragging .card { transition: transform var(--transition-normal); }

/* ===== Card ===== */
.card {
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  background: var(--glass-medium);
  border: 1px solid var(--glass-border-medium);
  border-radius: var(--radius);
  padding: 16px 18px;
  box-shadow: var(--shadow-card);
  border-left: 3px solid transparent;
  transition: box-shadow var(--transition-fast), transform var(--transition-fast),
    background var(--transition-fast);
  position: relative;
  animation: cardSlideIn 0.3s ease;
}
.card:hover {
  background: var(--glass-strong);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-pinned {
  border-left-color: var(--blue-500);
  background: var(--glass-strong);
}

.card-dragging {
  opacity: 0.5;
  transform: scale(0.98);
}

.card-drag-overlay {
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  background: var(--glass-strong);
  border: 1px solid var(--glass-border-strong);
  border-radius: var(--radius);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border-left: 3px solid var(--blue-500);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.card-hover-menu {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}
.card:hover .card-hover-menu { opacity: 1; }

.card-hover-menu button {
  border: none;
  background: none;
  font-size: 15px;
  padding: 4px 6px;
  cursor: pointer;
  opacity: 0.35;
  border-radius: 8px;
  transition: opacity var(--transition-fast), background var(--transition-fast);
  line-height: 1;
}
.card-hover-menu button:hover { opacity: 0.8; background: rgba(0, 0, 0, 0.04); }
.card-hover-menu .btn-icon-edit { color: var(--blue-500); }
.card-hover-menu .btn-icon-delete { color: var(--red-500); }

.card-drag-handle {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-tertiary);
  cursor: grab;
  opacity: 0;
  transition: opacity var(--transition-fast);
  padding: 4px 2px;
  user-select: none;
}
.card:hover .card-drag-handle { opacity: 0.5; }
.card-drag-handle:active { cursor: grabbing; }

.card-body { padding-left: 0; }
.card:hover .card-body { padding-left: 10px; transition: padding-left var(--transition-normal); }

.card-date-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.card-date-text {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.card-date-lunar {
  font-size: 11px;
  color: var(--text-tertiary);
}

.card-date-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(0, 122, 255, 0.1);
  color: var(--blue-500);
}

.card-countdown {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.card-countdown-soon {
  color: var(--blue-500);
  font-weight: 700;
}

.card-name {
  font-size: 19px;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 6px;
}

.card-reason {
  font-size: 13px;
  color: var(--blue-500);
  font-weight: 500;
  margin-top: 2px;
}

.card-notes {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 3px;
}

.card-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.tag-chip {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(0, 122, 255, 0.06);
  color: var(--blue-500);
  border: 1px solid rgba(0, 122, 255, 0.1);
}

/* ===== Empty State ===== */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  background: var(--glass-light);
  border: 1px dashed rgba(0, 122, 255, 0.15);
  border-radius: var(--radius);
}
.empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.6; }
.empty-state p { font-size: 14px; color: var(--text-secondary); }
.empty-state .empty-sub { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }

/* ===== Modal Overlay ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.15s ease;
}

.modal {
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  background: var(--glass-strong);
  border: 1px solid var(--glass-border-strong);
  border-radius: var(--radius);
  padding: 24px 28px;
  width: 460px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  animation: slideUp 0.2s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.modal-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}
.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.modal-close:hover { color: var(--text-primary); background: rgba(0, 0, 0, 0.04); }

/* ===== Form ===== */
.form-group { margin-bottom: 18px; }
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.form-group input[type="text"],
.form-group input[type="date"],
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-xs);
  font-size: 14px;
  font-family: inherit;
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.02);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  outline: none;
}
.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.08);
}
.form-group textarea { resize: vertical; }

.form-error {
  display: block;
  font-size: 12px;
  color: var(--red-500);
  margin-top: 4px;
}

.lunar-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}
.lunar-toggle-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.lunar-toggle-switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  cursor: pointer;
  position: relative;
  transition: background var(--transition-fast);
}
.lunar-toggle-switch.on { background: var(--blue-500); }
.lunar-toggle-switch::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  top: 2px;
  left: 2px;
  transition: transform var(--transition-fast);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.lunar-toggle-switch.on::after { transform: translateX(20px); }

.reason-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.reason-chip {
  padding: 6px 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.02);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.reason-chip:hover { border-color: var(--blue-border); color: var(--blue-500); }
.reason-chip.selected {
  background: var(--blue-500);
  color: #fff;
  border-color: var(--blue-500);
}
.reason-custom { margin-top: 4px; }

.tag-select {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-select .tag-option {
  padding: 5px 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.02);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.tag-select .tag-option:hover { border-color: var(--blue-border); color: var(--blue-500); }
.tag-select .tag-option.selected {
  background: var(--blue-500);
  color: #fff;
  border-color: var(--blue-500);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}

/* ===== Confirm Dialog ===== */
.confirm-dialog {
  backdrop-filter: var(--blur);
  -webkit-backdrop-filter: var(--blur);
  background: var(--glass-strong);
  border: 1px solid var(--glass-border-strong);
  border-radius: var(--radius);
  padding: 28px 32px;
  width: 380px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  text-align: center;
  animation: slideUp 0.2s ease;
}
.confirm-dialog h3 {
  font-size: 18px;
  color: var(--red-500);
  margin-bottom: 12px;
}
.confirm-dialog p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
}
.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* ===== Export/Import Bar ===== */
.export-import-bar {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}
.btn-export,
.btn-import {
  background: none;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-export:hover,
.btn-import:hover {
  border-color: var(--blue-border);
  color: var(--blue-500);
  background: var(--blue-bg);
}

/* ===== Animations ===== */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cardSlideIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cardSlideOut {
  from { opacity: 1; transform: scale(1); max-height: 200px; }
  to { opacity: 0; transform: scale(0.95); max-height: 0; padding: 0; margin: 0; }
}
```

- [ ] **步骤 2: Commit**

```bash
git add src/renderer/App.css
git commit -m "feat: rewrite CSS with clear-blue glass morphism theme"
```

---

### 任务 6：重写 Card 组件

**文件：**
- 修改: `src/renderer/components/Card.js`

- [ ] **步骤 1: 重写 Card.js**

将 `/Users/nickos_mac/Desktop/纪念日/src/renderer/components/Card.js` 替换为：

```js
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDate, daysUntilText } from '../utils/helpers.js';

export default function Card({ item, onEdit, onDelete, onTogglePin, isDragOverlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { text: countdownText, isSoon } = daysUntilText(item.date);
  const lunarLabel = item.isLunar ? '农历' : '';

  const cardContent = (
    <div
      className={`card ${item.pinned ? 'card-pinned' : ''} ${isDragging ? 'card-dragging' : ''}`}
      style={isDragOverlay ? undefined : style}
      ref={isDragOverlay ? undefined : setNodeRef}
    >
      {!isDragOverlay && (
        <div className="card-drag-handle" {...attributes} {...listeners}>
          ⋮⋮
        </div>
      )}
      <div className="card-top">
        <button
          className={`btn-pin ${item.pinned ? 'pinned' : ''}`}
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          title={item.pinned ? '取消置顶' : '置顶'}
        >
          📌
        </button>
        <div className="card-hover-menu">
          <button className="btn-icon-edit" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="编辑">
            ✎
          </button>
          <button className="btn-icon-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="删除">
            ✕
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="card-date-row">
          <span className="card-date-text">
            {lunarLabel && <span style={{ color: '#A0B5C8', marginRight: 4 }}>{lunarLabel}</span>}
            {formatDate(item.date, item.isLunar)}
          </span>
          {isSoon && <span className="card-date-badge">{countdownText}</span>}
          <span className={`card-countdown ${isSoon ? 'card-countdown-soon' : ''}`}>
            {countdownText}
          </span>
        </div>
        <h3 className="card-name">{item.name}</h3>
        <p className="card-reason">{item.reason}</p>
        {item.notes && <p className="card-notes">{item.notes}</p>}
        {item.tags && item.tags.length > 0 && (
          <div className="card-tags">
            {item.tags.map((tag) => (
              <span key={tag} className="tag-chip">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (isDragOverlay) return cardContent;

  return cardContent;
}
```

- [ ] **步骤 2: Commit**

```bash
git add src/renderer/components/Card.js
git commit -m "feat: rewrite Card with hover menu, countdown, lunar, tags, drag handle"
```

---

### 任务 7：重写 CardList 组件（拖拽排序）

**文件：**
- 修改: `src/renderer/components/CardList.js`

- [ ] **步骤 1: 重写 CardList.js 集成 dnd-kit**

将 `/Users/nickos_mac/Desktop/纪念日/src/renderer/components/CardList.js` 替换为：

```js
import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Card from './Card.js';

export default function CardList({ items, onEdit, onDelete, onTogglePin, onReorder }) {
  const [activeId, setActiveId] = React.useState(null);
  const activeItem = items.find((m) => m.id === activeId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event) => setActiveId(event.active.id);
  const handleDragEnd = (event) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((m) => m.id === active.id);
    const newIndex = items.findIndex((m) => m.id === over.id);
    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered.map((m) => m.id));
  };

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📅</div>
        <p>还没有纪念日</p>
        <p className="empty-sub">点击右上角「+ 新增」添加第一个吧</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <div className="card-list">
          {items.map((item) => (
            <Card
              key={item.id}
              item={item}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
              onTogglePin={() => onTogglePin(item.id)}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeItem ? (
          <Card
            item={activeItem}
            onEdit={() => {}}
            onDelete={() => {}}
            onTogglePin={() => {}}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **步骤 2: Commit**

```bash
git add src/renderer/components/CardList.js
git commit -m "feat: integrate dnd-kit drag-and-drop sorting in CardList"
```

---

### 任务 8：更新 AddEditForm — 农历 + 标签

**文件：**
- 修改: `src/renderer/components/AddEditForm.js`

- [ ] **步骤 1: 重写 AddEditForm.js**

将 `/Users/nickos_mac/Desktop/纪念日/src/renderer/components/AddEditForm.js` 替换为：

```js
import React, { useState } from 'react';
import { TAG_OPTIONS } from '../utils/helpers.js';

const REASONS = ['生日', '结婚纪念日', '恋爱纪念日', '忌日', '祭日', '毕业纪念日', '入职纪念日', '其他'];

export default function AddEditForm({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    date: item?.date || '',
    reason: item?.reason || '生日',
    notes: item?.notes || '',
    isLunar: item?.isLunar || false,
    tags: item?.tags || [],
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = '请输入人名';
    if (!form.date) newErrors.date = '请选择日期';
    if (!form.reason.trim()) newErrors.reason = '请选择或输入事由';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? '编辑纪念日' : '新增纪念日'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>人名 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="请输入人名"
            />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label>日期 *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
            <div className="lunar-toggle">
              <button
                type="button"
                className={`lunar-toggle-switch ${form.isLunar ? 'on' : ''}`}
                onClick={() => handleChange('isLunar', !form.isLunar)}
              />
              <span className="lunar-toggle-label">
                {form.isLunar ? '农历日期' : '公历日期'}
              </span>
            </div>
            {errors.date && <span className="form-error">{errors.date}</span>}
          </div>
          <div className="form-group">
            <label>事由 *</label>
            <div className="reason-options">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`reason-chip ${form.reason === r ? 'selected' : ''}`}
                  onClick={() => handleChange('reason', r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={REASONS.includes(form.reason) ? '' : form.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="或自定义输入..."
              className="reason-custom"
            />
            {errors.reason && <span className="form-error">{errors.reason}</span>}
          </div>
          <div className="form-group">
            <label>标签</label>
            <div className="tag-select">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-option ${form.tags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>备注</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="附加备注信息..."
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>取消</button>
            <button type="submit" className="btn-save">{item ? '保存修改' : '添加'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2: Commit**

```bash
git add src/renderer/components/AddEditForm.js
git commit -m "feat: add lunar toggle and tag selection to AddEditForm"
```

---

### 任务 9：更新 SearchBar — 增加标签筛选

**文件：**
- 修改: `src/renderer/components/SearchBar.js`

- [ ] **步骤 1: 重写 SearchBar.js 增加标签筛选行**

将 `/Users/nickos_mac/Desktop/纪念日/src/renderer/components/SearchBar.js` 替换为：

```js
import React from 'react';
import { TAG_OPTIONS } from '../utils/helpers.js';

export default function SearchBar({ value, onChange, selectedTags, onTagsChange }) {
  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <>
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索人名、事由或备注..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button className="search-clear" onClick={() => onChange('')}>✕</button>
        )}
      </div>
      <div className="tag-filter">
        {TAG_OPTIONS.map((tag) => (
          <button
            key={tag}
            className={`tag-filter-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </>
  );
}
```

- [ ] **步骤 2: Commit**

```bash
git add src/renderer/components/SearchBar.js
git commit -m "feat: add tag filter chips to SearchBar"
```

---

### 任务 10：新建 ExportImportBar 组件

**文件：**
- 创建: `src/renderer/components/ExportImportBar.js`

- [ ] **步骤 1: 创建 ExportImportBar.js**

写入 `/Users/nickos_mac/Desktop/纪念日/src/renderer/components/ExportImportBar.js`：

```js
import React, { useState } from 'react';

export default function ExportImportBar({ onRefresh }) {
  const [msg, setMsg] = useState('');

  const handleExport = async () => {
    const ok = await window.memorialAPI.exportData();
    setMsg(ok ? '导出成功' : '已取消');
    setTimeout(() => setMsg(''), 2000);
  };

  const handleImport = async () => {
    const count = await window.memorialAPI.importData();
    if (count > 0) {
      setMsg(`已导入 ${count} 条新记录`);
      onRefresh();
    } else if (count === 0) {
      setMsg('没有新记录需要导入');
    } else {
      setMsg('已取消');
    }
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="export-import-bar">
      {msg && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 'auto' }}>{msg}</span>}
      <button className="btn-export" onClick={handleExport}>📤 导出备份</button>
      <button className="btn-import" onClick={handleImport}>📥 导入数据</button>
    </div>
  );
}
```

- [ ] **步骤 2: Commit**

```bash
git add src/renderer/components/ExportImportBar.js
git commit -m "feat: add ExportImportBar component with backup/restore"
```

---

### 任务 11：重写 App.js 根组件

**文件：**
- 修改: `src/renderer/App.js`

- [ ] **步骤 1: 重写 App.js**

将 `/Users/nickos_mac/Desktop/纪念日/src/renderer/App.js` 替换为：

```js
import React, { useState, useEffect, useCallback } from 'react';
import CardList from './components/CardList.js';
import SearchBar from './components/SearchBar.js';
import AddEditForm from './components/AddEditForm.js';
import ConfirmDialog from './components/ConfirmDialog.js';
import ExportImportBar from './components/ExportImportBar.js';
import { filterByTags } from './utils/helpers.js';

export default function App() {
  const [memorials, setMemorials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadData = useCallback(async () => {
    const data = await window.memorialAPI.getAll();
    setMemorials(data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const sorted = [...memorials].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  const filtered = sorted.filter((m) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !m.name.toLowerCase().includes(q) &&
        !m.reason.toLowerCase().includes(q) &&
        !(m.notes && m.notes.toLowerCase().includes(q))
      ) return false;
    }
    return filterByTags([m], selectedTags).length > 0;
  });

  const handleAdd = () => { setEditingItem(null); setShowForm(true); };
  const handleEdit = (item) => { setEditingItem(item); setShowForm(true); };

  const handleSave = async (formData) => {
    if (editingItem) {
      await window.memorialAPI.update(editingItem.id, formData);
    } else {
      await window.memorialAPI.add(formData);
    }
    setShowForm(false);
    setEditingItem(null);
    loadData();
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await window.memorialAPI.delete(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    }
  };

  const handleTogglePin = async (id) => {
    await window.memorialAPI.togglePin(id);
    loadData();
  };

  const handleReorder = async (orderedIds) => {
    await window.memorialAPI.reorder(orderedIds);
    loadData();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>纪念日</h1>
        <button className="btn-add" onClick={handleAdd}>+ 新增</button>
      </header>
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
      />
      <CardList
        items={filtered}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
        onTogglePin={handleTogglePin}
        onReorder={handleReorder}
      />
      <ExportImportBar onRefresh={loadData} />
      {showForm && (
        <AddEditForm
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="确认删除"
          message={`确定要删除「${deleteTarget.name}」的「${deleteTarget.reason}」吗？此操作不可恢复。`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **步骤 2: Commit**

```bash
git add src/renderer/App.js
git commit -m "feat: integrate tag filter, drag reorder, export/import in App"
```

---

### 任务 12：更新 ConfirmDialog 样式对齐

**文件：**
- 修改: `src/renderer/components/ConfirmDialog.js`

- [ ] **步骤 1: 更新 ConfirmDialog.js**

将 `/Users/nickos_mac/Desktop/纪念日/src/renderer/components/ConfirmDialog.js` 替换为：

```js
import React from 'react';

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>取消</button>
          <button className="btn-delete-confirm" onClick={onConfirm}>确认删除</button>
        </div>
      </div>
    </div>
  );
}
```

JSX 结构不变，样式已通过 App.css 的 `.confirm-dialog` 规则更新为毛玻璃效果。

- [ ] **步骤 2: Commit**

```bash
git add src/renderer/components/ConfirmDialog.js
git commit -m "style: align ConfirmDialog with glass morphism theme"
```

---

### 任务 13：构建验证 + 手动测试

**文件：**
- 无新建文件

- [ ] **步骤 1: 运行 webpack 构建**

```bash
cd /Users/nickos_mac/Desktop/纪念日 && npx webpack --config webpack.config.cjs
```

预期：编译成功，`dist/renderer.js` 生成。

- [ ] **步骤 2: 启动 Electron 应用**

```bash
cd /Users/nickos_mac/Desktop/纪念日 && npm start
```

预期：Electron 窗口打开，显示清蓝渐变背景，毛玻璃搜索栏和卡片。

- [ ] **步骤 3: 手动验证清单**

逐项检查：
- [ ] 窗口背景显示清蓝渐变
- [ ] 搜索栏为毛玻璃效果
- [ ] 空状态显示精美提示
- [ ] 点击「+ 新增」→ 弹窗为毛玻璃 → 填写表单 → 保存
- [ ] 卡片显示倒计时（距今天 N 天）
- [ ] 鼠标移到卡片上 → hover 菜单浮出（✎ ✕）
- [ ] 点击 📌 → 卡片置顶，蓝色左边框
- [ ] 点击 ✎ → 编辑弹窗 → 农历开关 + 标签选择
- [ ] 点击 ✕ → 删除确认弹窗（毛玻璃效果）
- [ ] 拖拽卡片 → 排序生效
- [ ] 标签筛选 chip → 点击切换筛选
- [ ] 搜索输入 → 实时过滤
- [ ] 导出备份/导入数据按钮 → 功能正常
- [ ] 卡片入场/删除有动画

- [ ] **步骤 4: 如有编译错误，修复后重新构建**

- [ ] **步骤 5: Commit (如有修复)**

```bash
git add -A && git commit -m "fix: build and runtime issues"
```

---

### 任务 14：更新通知逻辑 — 兼容农历生日

**文件：**
- 修改: `notifications.cjs`

- [ ] **步骤 1: 重写 notifications.cjs 支持农历**

将 `/Users/nickos_mac/Desktop/纪念日/notifications.cjs` 替换为：

```js
const { Notification } = require('electron');
const cron = require('node-cron');
const store = require('./store.cjs');

let mainWindowRef = null;

function initNotifications(win) {
  mainWindowRef = win;
  cron.schedule('0 9 * * *', () => { checkUpcoming(); });
}

function getTargetDate(m) {
  if (m.isLunar && m._lunarNextDate) {
    return new Date(m._lunarNextDate);
  }
  return new Date(m.date);
}

function checkUpcoming() {
  const memorials = store.getAll();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  memorials.forEach((m) => {
    const target = getTargetDate(m);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      showNotification(`今天是 ${m.name} 的${m.reason}`, '就是今天！');
    } else if (diffDays === 1) {
      showNotification(`明天是 ${m.name} 的${m.reason}`, '提前一天提醒');
    } else if (diffDays === 3) {
      showNotification(`还有3天是 ${m.name} 的${m.reason}`, '提前三天提醒');
    } else if (diffDays === 7) {
      showNotification(`还有7天是 ${m.name} 的${m.reason}`, '提前一周提醒');
    }
  });
}

function showNotification(title, body) {
  if (!Notification.isSupported()) return;
  const notification = new Notification({ title, body });
  notification.on('click', () => {
    if (mainWindowRef) { mainWindowRef.show(); mainWindowRef.focus(); }
  });
  notification.show();
}

module.exports = { initNotifications, checkUpcoming };
```

- [ ] **步骤 2: Commit**

```bash
git add notifications.cjs
git commit -m "feat: support lunar birthday notifications"
```

---

### 任务 15：更新 HTML 入口 + 最终构建验证

**文件：**
- 修改: `public/index.html`（如需要）

- [ ] **步骤 1: 检查 HTML 是否需要更新 titleBarStyle 相关调整**

当前 index.html 无需修改。titleBarStyle: 'hiddenInset' 在 Electron 层面生效。

- [ ] **步骤 2: 完整构建 + 运行验证**

```bash
cd /Users/nickos_mac/Desktop/纪念日 && npx webpack --config webpack.config.cjs && npm start
```

- [ ] **步骤 3: 全面回归测试**

逐项验证任务 13 步骤 3 的检查清单。

- [ ] **步骤 4: 最终 Commit**

```bash
git add -A && git commit -m "feat: complete UI/UX optimization — glass morphism, drag sort, lunar, tags, export/import"
```
