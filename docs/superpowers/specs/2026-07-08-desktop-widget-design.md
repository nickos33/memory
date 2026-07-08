# 桌面常驻小组件 — 设计规格

> 设计日期: 2026-07-08 | 状态: 待实现

## 概述

在现有纪念日提醒 app 基础上，新增一个**桌面悬浮面板**。面板常驻桌面，显示即将到来的纪念日，用户无需打开主窗口即可查看。

## 形态

- **桌面悬浮面板**：独立的 BrowserWindow，无边框、半透明、始终在桌面层级
- **保留现有 Dock 图标 app**：主窗口不受影响，面板是第二个窗口

## 视觉设计

- **毛玻璃风格**：与主应用 CSS 变量统一（`--glass-medium`、`--blur`、`--radius`）
- 半透明白色背景 + backdrop-filter 模糊
- 圆角 16px
- 显示 3 个纪念日，内部可上下滚动查看更多

### 面板内容（每条纪念日）

```
┌─────────────────────────────────┐
│  💒 结婚纪念日       还有 3 天   │
│     结婚 · 妻子                 │
│─────────────────────────────────│
│  🎂 妈妈生日         还有 7 天   │
│     生日 · 家庭                 │
│─────────────────────────────────│
│  📅 入职纪念日       15 天后     │
│     入职 · 工作                 │
└─────────────────────────────────┘
```

## 位置

- **默认**：屏幕左上角（距离左上角各 20px）
- **持久化**：用户拖拽后保存位置到 `widget-config.json`
- **可拖拽**到桌面任意位置

## 交互行为

| 交互 | 行为 |
|------|------|
| 点击面板上任意纪念日 | 打开主应用窗口并聚焦 |
| 鼠标滚轮 | 面板内上下滚动查看更多纪念日 |
| 拖拽面板空白区域 | 移动面板到新位置 |
| 右键点击面板 | 弹出菜单：打开主窗口 / 隐藏面板 / 退出应用 |
| 右下角拖拽 | 调整面板宽高，持久化尺寸 |

## 窗口技术参数

| 属性 | 值 |
|------|-----|
| type | `panel`（或 `toolbar`） |
| frame | `false`（无边框） |
| transparent | `true` |
| alwaysOnTop | `true` |
| resizable | `true` |
| hasShadow | `true` |
| skipTaskbar | `true`（不显示第二个 Dock 图标） |
| movable | `true`（Electron 原生不支持无边框窗口拖拽，需 JS 实现） |

## 数据流

```
memorials.json
     │
     ├── 主窗口（App.js）
     │     └── 增删改 → 写入 memorials.json
     │              └── IPC 通知 → 面板窗口刷新
     │
     └── 面板窗口（Widget.js）
           ├── 启动时读取 memorials.json
           ├── 每 30 秒轮询读取（兜底）
           └── IPC 监听 → 收到通知后立即刷新
```

## 状态持久化

`widget-config.json` 存储：

```json
{
  "x": 20,
  "y": 20,
  "width": 260,
  "height": 200,
  "visible": true
}
```

## 主进程修改

- `main.mjs` 新增 `createWidget()` 函数，在 `app.whenReady()` 中调用
- 注册 IPC 通道：`widget:refresh`（主窗口通知面板刷新）
- 右键菜单用 `Menu.buildFromTemplate()`

## 文件清单

| 文件 | 说明 |
|------|------|
| `src/renderer/widget/Widget.js` | 面板 React 组件 |
| `src/renderer/widget/Widget.css` | 面板样式 |
| `src/renderer/widget/widget-index.js` | 面板 React 入口 |
| `public/widget.html` | 面板 HTML 入口 |
| `main.mjs`（修改） | 新增 createWidget + IPC + 右键菜单 |
| `preload.cjs`（修改） | 新增面板用 preload |

## 测试要点

- [ ] 面板默认在左上角显示
- [ ] 显示最近 3 个即将到来的纪念日
- [ ] 滚轮翻页查看更多
- [ ] 拖拽移动面板位置
- [ ] 点击纪念日打开主窗口
- [ ] 右键菜单三个选项正常
- [ ] 主窗口增删后面板实时刷新
- [ ] 重启应用后面板位置和大小恢复
- [ ] Dock 中只有一个 app 图标
