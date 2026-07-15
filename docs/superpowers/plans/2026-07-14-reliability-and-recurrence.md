# Memory 可靠性与周年提醒实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 消除数据丢失风险，让公历与农历纪念日按下一次发生日期可靠展示和提醒，并修复小组件及工程漂移。

**架构：** 把日期规则和数据变换抽成无副作用共享模块，主进程存储层只处理可靠文件读写，主窗口、小组件和通知共同调用同一套日期结果。旧记录读取时规范化，不执行破坏性迁移。

**技术栈：** Electron 28、React 18、Node `node:test`、Webpack、lunar-typescript。

---

## 文件职责

- 创建 `src/shared/memorial-date.mjs`：公历/农历周年计算。
- 创建 `src/shared/memorial-data.mjs`：校验、规范化、重排和导入合并。
- 创建 `test/memorial-date.test.mjs`、`test/memorial-data.test.mjs`：共享模块行为测试。
- 修改 `store.mjs`：原子写入、备份和严格错误处理。
- 修改 `notifications.mjs`：使用下一次发生日期。
- 修改 `src/renderer/App.js` 与组件：搜索、错误反馈、重复规则和农历输入。
- 修改 `src/renderer/widget/widget-index.js`：统一日期、即时刷新、恢复状态。
- 修改 `main.mjs`、`preload.cjs`、HTML：窗口状态、安全边界和事件清理。
- 修改 `package.json`、README 与规格文档：单入口、测试脚本和版本同步。

### 任务 1：安全重排与数据变换

- [x] 编写测试：部分 ID 重排后未参与项仍存在，未知/重复 ID 被拒绝。
- [x] 运行 `node --test test/memorial-data.test.mjs`，确认测试先失败。
- [x] 实现 `normalizeMemorial`、`reorderMemorials`、`mergeImportedMemorials`。
- [x] 接入 `store.mjs`，运行测试确认通过。

### 任务 2：可靠存储与导入

- [x] 为无效 JSON、无效字段、重复 ID 和旧记录默认值编写测试。
- [x] 将读取错误分为“文件不存在”和“文件损坏”。
- [x] 写入改为临时文件、备份、原子替换；导入改为事务式校验合并。
- [x] 在渲染层捕获 IPC 错误并显示用户可读提示。

### 任务 3：统一下一次发生日期

- [x] 编写公历当年/跨年、一次性、2 月 29 日、农历跨年的固定日期测试。
- [x] 实现 `getNextOccurrence`、`getDaysUntil`、`getOccurrenceText`。
- [x] 旧农历记录从原日期推导农历月日，新记录直接保存农历字段。
- [x] 通知、主窗口与小组件全部改用共享日期模块。

### 任务 4：表单、搜索与小组件

- [x] 表单增加重复规则和农历月日输入，保留旧数据编辑兼容。
- [x] 搜索加入备注，无结果显示专用文案。
- [x] 修复面板可见性持久化、即时刷新监听、恢复隐藏项持久化和 Dock 唤醒。
- [x] 为异步操作增加忙碌状态和错误提示。

### 任务 5：单入口、安全和文档

- [x] 从打包清单和仓库删除漂移的 CJS、`src/main`、旧 preload 实现。
- [x] 增加 CSP、导航/新窗口限制和 IPC 发送方及参数校验。
- [x] 增加可访问名称、表单关联、Escape 关闭和焦点样式。
- [x] 更新版本号、README、技术规格和执行计划。

### 任务 6：完成验证

- [x] 运行 `npm test`，预期 0 失败。
- [x] 运行所有主进程脚本语法检查，预期退出码 0。
- [x] 在 `/tmp` 运行生产 Webpack 编译，预期退出码 0。
- [x] 在 `/tmp` 运行 electron-builder 打包，确认 `app.asar` 只有单一入口。
- [x] 检查 `git diff --check`、`git status` 和最终差异，确保未包含现有 `AGENTS.md`。
