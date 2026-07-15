# 技术规格说明书

> 版本 v2.1.0 | 最后更新 2026-07-15

## 技术栈

Electron 28.2、React 18.3、Webpack 5、Node cron、lunar-typescript、@dnd-kit 和 electron-builder。应用完全离线，数据位于 Electron `userData` 目录。

## 运行架构

- `main.mjs`：唯一 Electron 主进程入口，管理主窗口、小组件、IPC、系统通知和登录项。
- `preload.cjs`：在隔离上下文中暴露 `memorialAPI`、`widgetAPI`。
- `store.mjs`：严格读取、上一版备份、临时文件写入和原子替换。
- `notifications.mjs`：每天 9:00 调度提醒。
- `src/shared/memorial-date.mjs`：公历、农历和下一次发生日期的唯一规则来源。
- `src/shared/memorial-data.mjs`：记录规范化、校验、局部重排和导入合并。
- `src/shared/startup-mode.mjs`：登录项默认配置和静默启动判断。
- `src/renderer/`：主窗口和悬浮小组件 React 界面。

## 启动模式

- 每次启动都确保 `openAtLogin: true`，不在主界面提供关闭按钮。
- `wasOpenedAtLogin: true` 时不创建主窗口，只显示桌面小组件。
- 手动启动、Dock 激活、小组件操作和通知点击通过同一入口按需创建并显示主窗口。
- 登录项注册失败只记录错误，不阻断应用运行。

## 数据模型

```json
{
  "id": "lxyz123abc45",
  "name": "妈妈",
  "date": "1990-03-08",
  "reason": "生日",
  "notes": "",
  "tags": ["家庭"],
  "isLunar": false,
  "recurrence": "yearly",
  "pinned": false,
  "order": 0,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
```

农历记录额外保存 `lunarYear`、`lunarMonth`、`lunarDay`、`lunarLeap`。旧记录没有 `recurrence` 时按 `yearly` 规范化；旧农历记录从 `date` 推导农历字段。

## 日期规则

- `yearly` 公历记录取当前或下一年的同月同日。
- 2 月 29 日在非闰年取 2 月 28 日。
- `yearly` 农历记录逐年换算到下一次公历日期，支持闰月。
- `once` 保留原完整日期，过期后显示“已过 N 天”。
- 主窗口、小组件排序和系统通知共用同一个计算模块。

## 数据安全

- 文件不存在时返回空列表；解析或结构错误时抛错并禁止覆盖。
- 每次覆盖前复制为 `memorials.json.bak`。
- 新数据先写同目录临时文件，再通过 `rename` 原子替换。
- 导入逐条校验，任一记录无效即拒绝整次导入。
- 局部拖拽只更新参与记录的顺序，永不删除未显示记录。

## 安全边界

- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。
- CSP 只允许本地脚本与样式；禁止外部连接、对象和表单提交。
- 禁止创建新窗口和跳转到非 `file://` 地址。
- IPC 仅接受本地 renderer，并在存储层继续校验数据结构。

## 验证命令

```bash
npm test
npm start
npm run build
```
