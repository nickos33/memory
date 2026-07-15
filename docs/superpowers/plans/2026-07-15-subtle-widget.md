# 雾面米灰小组件实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 降低桌面小组件的亮度、边框和阴影强度，使其更自然地融入桌面。

**架构：** 只修改小组件现有 CSS 视觉参数，不改变 React 结构、窗口配置、数据流或交互。使用生产构建、完整测试和目录打包验证没有引入回归。

**技术栈：** React、CSS、Webpack、Node.js 测试运行器、electron-builder

---

## 文件结构

- 修改 `src/renderer/widget/Widget.css`：雾面米灰面板、弱边框、浅阴影和低对比条目。
- 修改 `dev-logs/2026-07-15.md`：记录视觉微调和验证结果。

### 任务 1：弱化小组件视觉存在感

**文件：**
- 修改：`src/renderer/widget/Widget.css`
- 修改：`dev-logs/2026-07-15.md`

- [ ] **步骤 1：记录修改前的关键参数**

运行：

```bash
rg -n "background: rgba\(255, 247, 236|border: 1px solid|box-shadow:|widget-item \{" src/renderer/widget/Widget.css
```

预期：能定位当前高亮面板背景、白色边框、大范围阴影和条目背景。

- [ ] **步骤 2：替换为雾面米灰参数**

将面板和条目核心样式调整为：

```css
.widget-panel {
  background: rgba(218, 211, 202, 0.64);
  border: 1px solid rgba(255, 255, 255, 0.13);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.07);
}

.widget-item {
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.widget-item:hover {
  background: rgba(255, 255, 255, 0.24);
}
```

主文字改为 `#4e4944`，次要文字改为 `rgba(78, 73, 68, 0.62)`；临近倒计时保留低饱和 `#9b5543`。

- [ ] **步骤 3：确认核心选择器完整且改动只涉及样式**

运行：

```bash
rg -n "widget-panel|widget-list|widget-item|widget-hidden-bar|past-countdown" src/renderer/widget/Widget.css
git diff -- src/renderer/widget/Widget.css
```

预期：核心选择器均存在，差异中没有结构或脚本文件。

- [ ] **步骤 4：运行完整测试**

运行：`npm test`

预期：14 个测试全部 PASS，失败数为 0。

- [ ] **步骤 5：执行生产渲染构建**

运行：`ELECTRON_RUN_AS_NODE= npm exec webpack -- --config webpack.config.cjs --mode production`

预期：renderer 和 widget 均编译成功；允许已有包体大小警告，不允许编译错误。

- [ ] **步骤 6：重新打包应用**

运行：`npm run pack`

预期：生成 `release/mac-arm64/纪念日.app`，退出码为 0；允许本机缺少 Developer ID 的未签名提示。

- [ ] **步骤 7：更新开发日志并检查格式**

在 `dev-logs/2026-07-15.md` 增加“雾面米灰小组件：降低亮度、边框和阴影”的完成记录，并运行 `git diff --check`，预期无格式错误。
