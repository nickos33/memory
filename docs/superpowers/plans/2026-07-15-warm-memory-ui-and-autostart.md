# 温暖纪念册 UI 与静默开机启动实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 默认启用 macOS 登录启动，登录时只显示桌面小组件，并将主界面和小组件统一改为温暖纪念册风格。

**架构：** 将启动模式判断提取成无 Electron 依赖的共享函数并用 Node 测试覆盖；主进程通过一个按需创建主窗口的入口统一处理手动启动、小组件、Dock 激活和通知点击。UI 仅调整 React 结构和现有 CSS，不改变数据模型、日期算法或小组件行为。

**技术栈：** Electron、React、CSS、Node.js 内置测试运行器、Webpack、electron-builder

---

## 文件结构

- 创建 `src/shared/startup-mode.mjs`：封装登录项设置和是否静默启动的纯逻辑。
- 创建 `test/startup-mode.test.mjs`：覆盖手动启动、登录启动和登录项配置。
- 修改 `main.mjs`：默认注册登录项、区分启动模式、按需显示主窗口。
- 修改 `notifications.mjs`：通知点击时调用主窗口显示回调，兼容静默启动。
- 修改 `src/renderer/App.js`：删除启动开关，增加“下一个重要日子”概览区。
- 修改 `src/renderer/App.css`：实现温暖纪念册主界面及响应式、焦点样式。
- 修改 `src/renderer/widget/Widget.css`：实现同风格暖色半透明小组件。
- 修改 `preload.cjs`：移除不再使用的登录项设置 API。
- 修改 `README.md`、`docs/requirements.md`、`docs/tech-spec.md`、`dev-logs/2026-07-15.md`：同步实际行为和设计说明。

### 任务 1：建立可测试的启动模式规则

**文件：**
- 创建：`src/shared/startup-mode.mjs`
- 创建：`test/startup-mode.test.mjs`

- [ ] **步骤 1：编写失败的启动模式测试**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getLoginItemOptions, shouldOpenMainWindow } from '../src/shared/startup-mode.mjs';

test('登录启动时不打开主窗口', () => {
  assert.equal(shouldOpenMainWindow({ wasOpenedAtLogin: true }), false);
});

test('手动启动时打开主窗口', () => {
  assert.equal(shouldOpenMainWindow({ wasOpenedAtLogin: false }), true);
  assert.equal(shouldOpenMainWindow({}), true);
});

test('登录项始终开启并请求隐藏启动', () => {
  assert.deepEqual(getLoginItemOptions(), { openAtLogin: true, openAsHidden: true });
});
```

- [ ] **步骤 2：运行测试并确认因模块缺失而失败**

运行：`node --test test/startup-mode.test.mjs`

预期：FAIL，提示找不到 `src/shared/startup-mode.mjs`。

- [ ] **步骤 3：实现最小启动规则模块**

```js
export function getLoginItemOptions() {
  return { openAtLogin: true, openAsHidden: true };
}

export function shouldOpenMainWindow(loginSettings = {}) {
  return loginSettings.wasOpenedAtLogin !== true;
}
```

- [ ] **步骤 4：运行测试确认通过**

运行：`node --test test/startup-mode.test.mjs`

预期：3 个测试全部 PASS。

### 任务 2：实现静默登录启动和按需主窗口

**文件：**
- 修改：`main.mjs`
- 修改：`notifications.mjs`
- 修改：`preload.cjs`

- [ ] **步骤 1：在主进程导入启动规则并增加统一窗口入口**

在 `main.mjs` 导入 `getLoginItemOptions`、`shouldOpenMainWindow`，并将主窗口创建收敛为：

```js
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  mainWindow.show();
  mainWindow.focus();
  return mainWindow;
}
```

把主窗口 `close` 隐藏逻辑移入 `createWindow()`，确保静默启动后按需创建的窗口也拥有相同行为。

- [ ] **步骤 2：注册登录项并按启动来源决定是否创建主窗口**

将 `app.whenReady()` 启动段改为：

```js
app.whenReady().then(() => {
  try {
    app.setLoginItemSettings(getLoginItemOptions());
  } catch (error) {
    console.error('注册开机启动失败:', error);
  }

  const loginSettings = app.getLoginItemSettings();
  if (shouldOpenMainWindow(loginSettings)) showMainWindow();
  createWidget(true);
  initNotifications(showMainWindow);
  checkUpcoming();
});
```

`activate`、小组件标题、右键菜单统一调用 `showMainWindow()`；删除 `settings:getOpenAtLogin` 和 `settings:setOpenAtLogin` IPC。

- [ ] **步骤 3：保持通知点击可以打开按需窗口**

在 `notifications.mjs` 中将窗口引用替换为回调：

```js
let showMainWindowRef = null;

export function initNotifications(showMainWindow) {
  showMainWindowRef = showMainWindow;
  cron.schedule('0 9 * * *', () => checkUpcoming());
}
```

通知点击时执行 `showMainWindowRef?.()`；在 `preload.cjs` 删除 `settingsAPI` 暴露。

- [ ] **步骤 4：运行全部逻辑测试**

运行：`npm test`

预期：现有日期、数据和新增启动模式测试全部 PASS。

### 任务 3：重构主界面为温暖纪念册

**文件：**
- 修改：`src/renderer/App.js`
- 修改：`src/renderer/App.css`

- [ ] **步骤 1：删除开机启动 UI 状态和按钮**

从 `App.js` 删除 `openAtLogin` 状态、读取副作用、`handleOpenAtLogin` 和对应按钮，保留“面板”“搜索”“新增”三个操作。

- [ ] **步骤 2：增加最近纪念日概览数据**

在 `App.js` 使用现有 `getOccurrenceText` 结果选出距离最近的一项，渲染：

```jsx
<section className="next-memory" aria-label="下一个重要日子">
  <p className="next-memory-label">值得期待的日子</p>
  <strong>{nextMemory ? getOccurrenceText(nextMemory).text : '从今天开始记录'}</strong>
  <span>{nextMemory ? `${nextMemory.name} · ${nextMemory.reason}` : '添加第一条纪念日'}</span>
</section>
```

最近项使用 `getNextOccurrence` 排序，避免改变卡片的置顶与手动顺序。

- [ ] **步骤 3：替换主题变量和主要组件样式**

将根主题改为米白和陶土红：

```css
:root {
  --page: #f6efe6;
  --paper: rgba(255, 250, 243, 0.9);
  --accent-500: #b75d47;
  --accent-600: #984835;
  --text-primary: #49372f;
  --text-secondary: #7b6458;
  --line: rgba(117, 84, 65, 0.15);
}
```

同步调整背景、标题、概览区、按钮、卡片、搜索、标签、弹窗和表单；保留 `:focus-visible`，正文对比度不低于现有主题。

- [ ] **步骤 4：检查窄窗口布局**

增加 `@media (max-width: 680px)`：操作区换行、概览区缩小、卡片倒计时不覆盖名称，确保 600px 最小窗口仍完整可用。

- [ ] **步骤 5：构建渲染包**

运行：`ELECTRON_RUN_AS_NODE= webpack --config webpack.config.cjs --mode production`

预期：`renderer.js` 与 `widget.js` 均成功生成，无编译错误。

### 任务 4：统一桌面小组件视觉

**文件：**
- 修改：`src/renderer/widget/Widget.css`

- [ ] **步骤 1：替换小组件面板和条目样式**

使用暖色半透明面板：

```css
.widget-panel {
  background: rgba(255, 247, 236, 0.88);
  color: #49372f;
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow: 0 12px 34px rgba(73, 55, 47, 0.18);
}

.widget-item { background: rgba(183, 93, 71, 0.07); }
.widget-item-countdown.soon { color: #a64f3b; }
```

为标题、次要文字、隐藏栏、过去项目和 hover 状态补齐对应暖色，保持当前尺寸和 DOM 结构不变。

- [ ] **步骤 2：验证所有小组件交互选择器仍存在**

运行：`rg -n "widget-panel|widget-list|widget-item|widget-hidden-bar|past-countdown" src/renderer/widget/Widget.css`

预期：五类核心选择器均有定义。

- [ ] **步骤 3：再次运行生产渲染构建**

运行：`ELECTRON_RUN_AS_NODE= webpack --config webpack.config.cjs --mode production`

预期：构建成功，无 CSS 或 JSX 错误。

### 任务 5：文档、回归验证与打包

**文件：**
- 修改：`README.md`
- 修改：`docs/requirements.md`
- 修改：`docs/tech-spec.md`
- 创建：`dev-logs/2026-07-15.md`

- [ ] **步骤 1：同步用户文档**

将“用户自行开启或关闭开机启动”改为“默认开机自启动；登录时仅显示小组件”，并记录温暖纪念册主题及从小组件打开主界面的方式。

- [ ] **步骤 2：运行完整自动化测试**

运行：`npm test`

预期：全部测试 PASS，退出码为 0。

- [ ] **步骤 3：检查残留启动开关代码**

运行：`rg -n "openAtLogin|settingsAPI|开机启动：|getOpenAtLogin|setOpenAtLogin" src preload.cjs main.mjs`

预期：只允许 `src/shared/startup-mode.mjs` 中登录项配置出现 `openAtLogin`；不存在 UI 开关或设置 IPC。

- [ ] **步骤 4：执行生产构建和目录打包**

运行：`npm run pack`

预期：Webpack 成功，`release/mac-arm64/纪念日.app` 生成，退出码为 0。

- [ ] **步骤 5：手动冒烟验证**

打开打包后的 App，确认主界面、小组件、暖色主题、新增/编辑/搜索、面板切换和从小组件打开主界面可用。随后用登录项参数或主进程诊断输出确认 `wasOpenedAtLogin` 分支不会创建主窗口。

- [ ] **步骤 6：记录结果并仅提交本功能文件**

提交前运行 `git diff --check`，仅暂存本计划列出的文件，避免混入用户已有改动；提交信息使用：

```text
feat: 默认静默启动并更新温暖纪念册界面
```
