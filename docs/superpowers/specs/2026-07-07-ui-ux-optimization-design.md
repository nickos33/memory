# 纪念日桌面应用 — UI/UX 全量优化设计规格

日期: 2026-07-07
状态: 已确认

---

## 概述

在现有 Electron + React 纪念日提醒应用基础上进行全面优化。覆盖视觉风格升级(P1)、基础体验增强(P0)、交互增强(P2)、功能增强(P3)四个维度。

---

## 设计决策

### 整体风格: 混合方案

- **基底**: 极简纯白 + Apple Notes 风格 (简洁克制)
- **点缀**: 毛玻璃半透明卡片 + 弹窗
- **色彩基调**: 清蓝 · 晨雾湖面

### 配色方案

| 用途 | 色值 | 说明 |
|------|------|------|
| 窗口渐变背景 | `linear-gradient(180deg, #E6EDF5 0%, #EEF2F8 40%, #EDF2F7 100%)` | 清蓝渐变 |
| 主强调色 | `#007AFF` | 替代原红色,用于置顶/标记/按钮 |
| 文字主色 | `#3A5068` | 深蓝灰, 替代纯黑 |
| 辅助文字 | `#8A9EB0` | 日期/倒计时/备注 |
| 删除按钮 | `#FF3B30` | 保留红色仅用于删除操作 |
| 卡片背景 | `rgba(255,255,255,0.65~0.72)` | 毛玻璃半透明 |
| 卡片边框 | `rgba(255,255,255,0.7~0.85)` | 细微白边 |
| 搜索栏背景 | `rgba(255,255,255,0.7)` | 毛玻璃输入框 |

### 卡片设计

- 圆角 16px, 毛玻璃 blur 14px, 细微白边框
- 置顶卡片: 蓝色左边框 3px (`#007AFF`), 背景略不透明
- 阴影: 极浅 `0 1px 4px rgba(0,0,0,0.03)`
- 操作按钮: **hover 悬浮菜单** — 默认隐藏, 鼠标移入卡片时右上角浮现编辑✎/删除✕图标
- 置顶钉子: 始终显示, 非置顶卡片淡至 25% 不透明度

### 倒计时

- 位置: 日期行右侧, 与日期和"今天/明天"标记同行
- 格式: `距今天 N 天` / `今天` / `N 天前`
- 今天/明天: 蓝色标记 (`#007AFF`, 10% 背景)

### 动效

- 卡片入场: fade + slideUp, 0.2s
- 卡片删除: 收起动画
- 新增长片: 展开动画
- 置顶切换: 平滑移动到顶部
- 毛玻璃弹窗: blur 过渡
- 弹窗: 遮罩 fadeIn 0.15s + 面板 slideUp 0.2s

---

## P0 · 基础增强

### 倒计时天数显示
- 每张卡片日期行右侧显示距今天数
- 今天 → 蓝色"今天"标记
- 明天 → 蓝色"明天"标记
- 已过去 → "N 天前"
- 未来 → "距今天 N 天"

### 空状态优化
- 精美空状态: 大图标 + 引导文案
- 样式与整体风格统一

---

## P1 · 视觉风格升级

### 窗口渐变背景
- 清蓝柔和渐变, 毛玻璃卡片悬浮其上

### 配色迁移 (红→蓝)
- 置顶边框: 红→蓝 (`#EF5350`→`#007AFF`)
- 临近标记: 红→蓝
- 事由文字: 保持蓝色
- 删除操作: 保留红色 `#FF3B30`

### 毛玻璃效果
- 卡片: `backdrop-filter: blur(14px)` + 半透明白底
- 搜索栏: 毛玻璃
- 弹窗/模态: 毛玻璃

### 按钮简化
- 卡片上不常显编辑/删除文字按钮
- hover 时右上角浮出 ✎(编辑) / ✕(删除) 图标(淡→深)

### 新增按钮
- 蓝色圆角胶囊 `#007AFF`, 阴影 `0 2px 8px rgba(0,122,255,0.25)`

---

## P2 · 交互增强

### 拖拽排序
- 集成 `@dnd-kit/core` + `@dnd-kit/sortable`
- 支持拖拽卡片重新排列
- 排序结果持久化到 electron-store
- 原"置顶"功能保留(拖拽+置顶互不冲突)

### 键盘快捷键
- 不做

---

## P3 · 功能增强

### 农历支持
- 集成 `lunar-javascript` 或 `lunar-typescript`
- 新增/编辑表单支持切换公历/农历
- 农历生日: 自动推算次年农历对应的公历日期
- 卡片日期行: 公历+农历双行显示(当勾选了农历)
- 事由为"生日"且勾选农历: 按农历日期计算下次生日并触发提醒

### 分类标签
- 预设标签: 家庭 / 工作 / 朋友 / 自定义
- 卡片顶部或底部显示标签 chip
- 搜索栏旁增加标签筛选下拉/横向 chip 组
- 数据模型扩展: `tags: string[]`

### 数据导出/导入
- 设置页或菜单栏「导出备份」→ 保存为 JSON 文件
- 支持从 JSON 文件导入合并(去重)
- 使用 Electron dialog.showSaveDialog / showOpenDialog

---

## 数据模型扩展

```json
{
  "id": "uuid",
  "name": "string",
  "date": "YYYY-MM-DD",
  "reason": "string",
  "notes": "string",
  "pinned": "boolean",
  "order": "number",
  "isLunar": "boolean",
  "tags": ["string"],
  "createdAt": "ISO-string",
  "updatedAt": "ISO-string"
}
```

新增字段: `order` (拖拽排序), `isLunar` (农历标记), `tags` (分类), `createdAt`, `updatedAt`

---

## 技术选型

| 需求 | 方案 |
|------|------|
| 拖拽排序 | `@dnd-kit/core` + `@dnd-kit/sortable` |
| 农历计算 | `lunar-typescript` |
| 文件对话框 | Electron `dialog` API |
| 存储 | 现有 `electron-store` |

---

## 文件变更范围

| 文件 | 变更类型 |
|------|----------|
| `src/renderer/App.js` | 重构: 增加状态(tags/drag/lunar), 拖拽容器 |
| `src/renderer/App.css` | 重构: 全面改写配色/渐变/毛玻璃/动效 |
| `src/renderer/components/Card.js` | 重构: hover菜单/倒计时/农历/标签chip |
| `src/renderer/components/CardList.js` | 重构: 拖拽排序容器 |
| `src/renderer/components/AddEditForm.js` | 增强: 农历开关/标签选择 |
| `src/renderer/components/SearchBar.js` | 增强: 标签筛选 |
| `src/renderer/components/ConfirmDialog.js` | 样式更新 |
| `src/renderer/utils/helpers.js` | 增强: 倒计时/农历格式化 |
| `src/main/store.mjs` | 增强: order字段支持 |
| `src/main/main.js` | 增强: 导出导入 IPC 通道 |
| `src/preload.cjs` | 增强: 暴露新 API |
| `package.json` | 新增依赖 |
