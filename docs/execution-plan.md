# 分步执行计划

## 已完成

- [x] Electron + React 主窗口
- [x] 纪念日新增、编辑、删除、置顶、搜索和标签
- [x] 拖拽排序与局部筛选安全保护
- [x] 公历/农历与每年/单次规则
- [x] 下一次发生日期、跨年提醒和 2 月 29 日规则
- [x] 桌面悬浮小组件、状态持久化和即时同步
- [x] 导入校验、自动备份和原子写入
- [x] CSP、sandbox、导航限制和有限 IPC
- [x] Node 数据/日期回归测试
- [x] electron-builder arm64 打包配置

## 后续优化

- [ ] Apple Developer ID 签名和 notarization
- [ ] 将农历库从小组件主包拆分，降低 bundle 体积
- [ ] 增加 Electron 端到端自动化测试
- [ ] 如需要原生 macOS 桌面小组件，另建 Swift/WidgetKit 扩展

**当前阶段：** v2.1.0 可靠性修复与发布验证已完成；正式分发仍需 Apple 签名和 notarization。
