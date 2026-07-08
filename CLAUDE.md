# 纪念日提醒软件 — 开发指引

一个运行在 Mac 上的纪念日提醒桌面应用，基于 Electron + React 构建。支持记录、查看、搜索和提醒各类纪念日。

## 文档索引

- **需求规格**：[docs/requirements.md](docs/requirements.md) — 功能需求、用户场景
- **技术规格**：[docs/tech-spec.md](docs/tech-spec.md) — 技术栈、架构、数据模型
- **设计规范**：[docs/design-spec.md](docs/design-spec.md) — UI 配色、组件规范、交互说明
- **执行计划**：[docs/execution-plan.md](docs/execution-plan.md) — 分阶段执行步骤

## 开发日志

每天工作结束后，在 `dev-logs/YYYY-MM-DD.md` 中记录：
- **完成事项**：今天做了什么
- **待办事项**：明天要做什么
- **遇到的问题**：阻塞或困难
- **备注**：任何需要记录的点

## 开发约定

- 小步推进，每步完成后可独立验证
- 不跳步，不合并阶段
- 代码修改前先确认当前状态
- 每个阶段完成后运行 `npm start` 手动验证

## 常用命令

```bash
npm start       # webpack 编译 + 启动 Electron
npm run dev     # webpack watch + 启动 Electron
npm run build   # 生产构建 + 打包 .dmg
npm run pack    # 仅打包（不生成安装包）
```
