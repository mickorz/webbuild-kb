# MVP 执行报告：API 补采与完整性审计

阶段：MVP（设计：dev-docs/design/2026-11-28-api-capture-audit-mvp.md）
完成时间：2026-11-28

## 交付清单

| 交付物 | 位置 | 说明 |
|--------|------|------|
| 缺陷修复：body 变体保留 | workspace/bishuxiezuo/capture-steps.mjs | key 追加请求体 sha256 前 12 位，同 URL 不同请求体不再互相覆盖 |
| 缺陷修复：丢弃落盘 | 同上 | 响应体不可读 / 超 12MB / handler 异常写入 `capture-failures.jsonl`，不再静默 |
| 缺陷修复：请求体入库 | 同上 | 归档条目新增 `reqBody` 字段（`request.postData()`） |
| 新能力：交互补采 | 同上 | `--interactive` 有头浏览器人工操作，终端回车结束录制并合并（要求 TTY） |
| 新工具：覆盖率审计 | .claude/skills/uiforge-site-clone/scripts/api-coverage-audit.mjs | 端点清点、异常状态、变体冲突、POST 缺请求体、文件缺失、丢弃统计、`--extra` 对比 |
| 基线报告 | workspace/bishuxiezuo/api-coverage-report.md | bishuxiezuo 现有归档首份审计 |
| 冒烟检查 | dev-examples/capture-steps-smoke/ | 本地服务器 + 断言脚本，全绿 |
| Skill 登记 | .claude/skills/uiforge-site-clone/SKILL.md | v1.3.0，新增「API 覆盖率审计与交互补采」章节 |
| 设计文档 | dev-docs/design/2026-11-28-api-capture-audit-mvp.md | 三期设计与选型结论 |

## 验证结果

1. 冒烟测试（dev-examples/capture-steps-smoke/run.mjs，exitCode 0）：
   - 两个同 URL 不同请求体的 POST 保留为 2 条变体，key 不同，reqBody 正确入库
   - 13MB 响应触发 `response-body-too-large` 记录，不再静默丢弃
   - api-coverage-audit 正常产出报告并识别变体冲突
2. 基线审计（bishuxiezuo 归档 338 条）：
   - 41 个去重 API 端点、44 条 API 条目
   - 异常状态 2 条（`/api/books/<id>/chapters/1` 与 `.../1/guide` 均为 404）
   - 变体冲突 3 组（chapter-rounds / chapters / world 各 2 条，修复前采集，历史变体可能已被覆盖）
   - POST 缺请求体 5 条（旧格式数据，回放只能按 URL 匹配）
   - 文件缺失 0、丢弃记录 0（采集早于落盘机制引入）

## 验收对照

- 「能明确知道哪些 API 有异常/被丢弃/存在变体冲突」：达成（基线报告即证据）
- 「--interactive 全程人工操作可录全量 API 并安全合并」：代码路径与合并逻辑已验证（与 --step 共用），实站首次人工补采待用户参与后完成

## Commit

- 见同日 commit（修复 + 审计工具 + 文档 + 冒烟）

## 遗留与下一步

1. 实站 `--interactive` 补采（需登录态 + 人工操作），完成后 `--extra` 对比产出缺失清单
2. Phase 2：Browser Bridge Watch 因果时间线、serve 模板升级（599 / unmatched.jsonl / 按请求体匹配 FIFO）
3. 修复前旧归档条目无 reqBody，涉及请求体变体的功能需重采
