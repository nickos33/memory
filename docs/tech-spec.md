# 技术规格说明书

> 版本 v1.0.0 | 最后更新 2026-07-08

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面运行时 | Electron | 28.2.0 |
| UI 框架 | React | ^18.3 |
| 样式 | 纯 CSS（毛玻璃主题） | — |
| 打包 | webpack 5 | ^5.107 |
| 数据存储 | JSON 文件（手动读写） | — |
| 定时任务 | node-cron | ^3.0 |
| 农历 | lunar-typescript | ^1.8.6 |
| 拖拽排序 | @dnd-kit/core + @dnd-kit/sortable | ^6.3 / ^10.0 |
| 编译 | Babel | ^7.29 |
| 打包分发 | electron-builder | ^24.13 |

## 架构

```
┌──────────────────────────────────┐
│         Electron Main            │
│  ┌──────────┐  ┌──────────────┐  │
│  │  Store   │  │ Notifications│  │
│  │ (JSON)   │  │  (cron+API)  │  │
│  └──────────┘  └──────────────┘  │
│         │ IPC (preload) │         │
├─────────┼───────────────┼─────────┤
│         ▼               ▼         │
│       Electron Renderer          │
│  ┌────────────────────────────┐  │
│  │        React App           │  │
│  │  ┌──────┐ ┌────────────┐   │  │
│  │  │Card  │ │AddEditForm │   │  │
│  │  │List  │ │   + Modal  │   │  │
│  │  └──────┘ └────────────┘   │  │
│  │  ┌──────────┐ ┌─────────┐  │  │
│  │  │SearchBar │ │Confirm  │  │  │
│  │  └──────────┘ └─────────┘  │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

## 项目结构

```
纪念日/
├── main.mjs              # Electron 主进程入口（ESM）
├── main.cjs              # Electron 主进程入口（CJS 备用）
├── preload.cjs           # 预加载脚本（contextBridge）
├── notifications.mjs     # 通知模块（node-cron 定时提醒）
├── store.mjs             # 数据存储模块（JSON 读写）
├── webpack.config.cjs    # Webpack 构建配置
├── package.json          # 项目配置 & electron-builder 打包配置
├── public/
│   └── index.html        # HTML 入口
├── src/renderer/
│   ├── index.js          # React 入口
│   ├── App.js            # 根组件
│   ├── App.css           # 全局样式
│   ├── utils/
│   │   └── helpers.js    # 工具函数
│   └── components/
│       ├── AddEditForm.js   # 新增/编辑表单弹窗
│       ├── Card.js          # 纪念日卡片（含拖拽）
│       ├── CardList.js      # 卡片列表（dnd-kit）
│       ├── ConfirmDialog.js # 删除确认弹窗
│       ├── ExportImportBar.js # 导出/导入工具栏
│       └── SearchBar.js     # 搜索栏 + 标签筛选
├── dist/                 # Webpack 构建输出
├── release/              # electron-builder 打包输出
└── dev-logs/             # 开发日志
```

## 数据模型

### memorials.json 数据结构

```json
[
  {
    "id": "lxyz123abc45",
    "name": "结婚纪念日",
    "date": "2024-05-20",
    "reason": "结婚",
    "notes": "",
    "tags": ["家庭"],
    "isLunar": false,
    "_lunarNextDate": "2026-06-15T00:00:00Z",
    "pinned": false,
    "order": 0,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-07-08T00:00:00.000Z"
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识（36进制时间戳 + 5位随机） |
| `name` | string | 纪念日名称/人名 |
| `date` | string | 日期 YYYY-MM-DD |
| `reason` | string | 纪念类型（预设或自定义） |
| `notes` | string | 备注（可选） |
| `tags` | string[] | 标签列表 |
| `isLunar` | boolean | 是否农历日期 |
| `_lunarNextDate` | string | 农历下次对应的公历日期（运行时计算） |
| `pinned` | boolean | 是否置顶 |
| `order` | number | 拖拽排序序号 |
| `createdAt` | string | 创建时间 ISO |
| `updatedAt` | string | 更新时间 ISO |

### 排序规则

1. 置顶的纪念日排在最前面
2. 拖拽排序后写入 `order` 字段，同 pin 状态下按 order 升序
3. 新创建的纪念日 order 为 0

## IPC 接口

所有接口通过 `window.memorialAPI`（preload contextBridge）暴露给渲染进程。

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `memorialAPI.getAll()` | 无 | `Array` | 获取全部纪念日 |
| `memorialAPI.add(data)` | `{name, date, reason, ...}` | `Object` | 新增纪念日 |
| `memorialAPI.update(id, data)` | `id, {...}` | `Object` | 更新纪念日 |
| `memorialAPI.delete(id)` | `id` | `boolean` | 删除纪念日 |
| `memorialAPI.togglePin(id)` | `id` | `Object` | 切换置顶状态 |
| `memorialAPI.reorder(ids)` | `[id1, id2, ...]` | `Array` | 拖拽排序后更新顺序 |
| `memorialAPI.exportData()` | 无 | `boolean` | 导出 JSON 备份文件 |
| `memorialAPI.importData()` | 无 | `number` | 导入 JSON 备份文件（返回新记录数） |

## 通知规则

- 每天早上 9:00 检查（node-cron `0 9 * * *`）
- 当天 → "就是今天！"
- 提前 1 天 → "提前一天提醒"
- 提前 3 天 → "提前三天提醒"
- 提前 7 天 → "提前一周提醒"
- 点击通知打开主窗口

## 安全

- `contextIsolation: true`：渲染进程无法直接访问 Node.js
- `nodeIntegration: false`：禁用 Node 集成
- 通过 `preload.cjs` + `contextBridge` 暴露有限 API

## 图标

- 源文件：`IMG_6850.JPG`（1279×1604 竖版照片）
- 处理方式：居中裁剪 → 1024×1024 方形 → 72 DPI
- 生成 `.icns`：`iconutil -c icns`
- **不调用 `app.dock.setIcon()`**（会导致 Dock 图标变大），依赖 `CFBundleIconFile` 自动加载

## 开发命令

```bash
npm start       # 构建 + 打包 + 打开 app
npm run build   # 生产构建 + 打包 .dmg
npm run pack    # 仅打包（不生成安装包）
```

## 已知问题

- `ELECTRON_RUN_AS_NODE=1` 环境变量阻止 electron 二进制下载，安装前需 `unset`
- `node_modules/electron/index.js` 遮蔽 Electron 内置模块，开发时用 `npm start`（构建+打包）代替 `npx electron .`
