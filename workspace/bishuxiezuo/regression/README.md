# Replay Regression（Batch 5）

离线回放的自动回归工程：serve v2.3 + Playwright，验证「已采集的功能能否稳定回放」。

## 运行

```bash
cd workspace/bishuxiezuo/regression
node replay-regression.mjs
# 退出码: 0 全部通过 / 1 有失败（可接 CI）
```

## 工程约束

- 每次运行复制归档到 `.run/archive` 临时副本，**不改原始归档**
- serve v2.3 模板取自 skill scripts 最新版，独立空闲端口，结束自动关闭
- 每个页面场景独立 Browser Context；非本机请求一律拦截，**命中原站域名即失败**
- 失败证据（截图/DOM/console/网络摘要/unmatched 增量）落 `report/evidence/<场景>/`
- 报告: `report/ReplayCoverageReport.md`（入库）+ `coverage-<时间戳>.json`（不入库）

## 断言分层

| 层 | 内容 |
|----|------|
| L1 页面 | 选择器可见、页面文本、元素计数 |
| L2 API | 状态码 + JSON 字段（dot-path，`present` / `contains:` 前缀；字段断言用直接重放保证确定性） |
| L3 匹配 | unmatched 增量 kind 检查（默认禁 `unmatched` / `ambiguous-*`）；并发 FIFO 确定性 |
| L4 完整性 | 原站泄漏拦截、JS 错误上限、404 必须为录制态、第三方依赖拦截记录 |

## 场景（scenarios.json）

S01 入口 / S02 书架 / S03 世界观 / S04 四步向导 / S05 书架助手 / S06 并发 FIFO / S07 异常诊断。

人工补采（Batch 4）后：更新 `scenarios.json` 增加场景 → 重跑 → 覆盖率报告。设计见 `dev-docs/progress-result/Batch5-执行报告.md`。
