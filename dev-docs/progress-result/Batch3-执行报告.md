# Batch 3 执行报告：Replay v2.3 完整性加固

阶段：Batch 3（T1-T6，回放正确性优先；Browser Bridge 与 api-catalog 继续延后）
完成时间：2026-11-28

## 交付清单

| 任务 | 交付物 | 说明 |
|------|--------|------|
| T1 同签名多响应 FIFO（P0） | replay-serve-v2.mjs v2.3 + capture-steps.mjs | 归档允许同 key 多条目；回放按请求顺序消费，超出停在最后一版；采集端相同响应体（含跨运行）去重 |
| T2 Query 归一化与歧义检测 | 同上 | norm 对 query 参数按名排序（采集与回放两侧一致）；URL 级回退多候选 → 599 + `ambiguous-body-variant` / `ambiguous-query-variant`；唯一候选回退 → 200 + `query-variant-fallback` 留痕 |
| T3 原始状态码保留 | serve v2.3 | 删除 `<500 ? status : 200` 改写，录制 5xx 原样回放 |
| T4 截断请求体不指纹 | 两侧 | 采集端 >1MB 的 reqBody 截断入库标 `reqBodyTruncated`（指纹按完整体）；回放端 >10MB 截断请求不做指纹匹配，URL 级回退 + `request-body-truncated` 留痕 |
| T5 审计扩展 | api-coverage-audit.mjs | 新增「同签名多响应版本」「请求体截断」两节 |
| T6 回放测试 | dev-examples/replay-v23-smoke + capture-steps-smoke 扩展 | 断言响应内容（JSON 字段级），不只看状态码 |

## 验证结果

- replay-v23 冒烟（合成归档 + serve v2.3）：19 项断言全绿——FIFO 三连消费（GET/POST）、超出停最后一版、乱序 query 精确匹配、多候选 599、唯一候选回退、5xx 原样、指纹命中、变体回退、截断回退、5 种留痕 kind
- capture 冒烟（真实浏览器两轮采集 + 回放）：16 项断言全绿——变体分键、FIFO 版本按录制序排列、重复点击/跨运行去重、回放消费顺序 n:1→n:4→停最后一版、报告含多版本章节
- bishuxiezuo 实测（v2.3 已写入归档）：`POST /api/assistant/sessions` 指纹命中 201；body 不匹配场景由 v2.2 的「静默回 201 错数据」变为「599 拒绝猜测 + ambiguous-body-variant 留痕」；录制 404 保持 404；query 未录制唯一候选回退 200 + 留痕；入口页 200

自测中发现并修复：
1. capture-steps 响应文件原按 key 哈希命名，多版本会互相覆盖 → 改按响应内容哈希命名
2. 测试脚本自身两处算错（漏 goB 步骤、FIFO 期望值算错），实现无误

## 行为变更（对已有工作流）

- serve v2.2 下「body 不匹配静默回退 201」的场景，v2.3 变为 599——这是本批的目标行为（拒绝拿错数据），补采该变体后恢复 200
- 采集重复运行不再无限膨胀 index.json（相同响应去重），新业务状态自动成为新版本
- 升级仍用 `upgrade-replay-serve.mjs`，版本标记 2.3 幂等

## 遗留与下一步

1. Batch 4：人工探索补采（书架搜索/筛选/分页/排序、世界观增删改、角色、故事规划、助手会话、弹窗、上传下载），直接用 `--interactive` / `--step`，不新增工具
2. Batch 5：自动化回放回归——Playwright 驱动 serve v2.3，执行交互路径后检查 unmatched-requests.jsonl / body-variant-fallback / 响应内容，产出 Replay Coverage Report
3. 旧格式 POST 条目（无 reqBody）在多变体场景会触发 599，重采后自动获得指纹匹配
