# Phase 2 执行报告：回放服务器升级（serve v2.2）与实站补采

阶段：Phase 2 第一批（统一格式与回放升级的一部分；Browser Bridge 接入与 api-catalog 未启动）
完成时间：2026-11-28

## 交付清单

| 交付物 | 位置 | 说明 |
|--------|------|------|
| 回放服务器 v2.2 | .claude/skills/uiforge-site-clone/scripts/replay-serve-v2.mjs | 请求体指纹匹配优先、未命中 599 + 诊断 JSON、变体回退留痕 |
| 升级脚本 | .claude/skills/uiforge-site-clone/scripts/upgrade-replay-serve.mjs | 写入归档并备份 v1 为 serve.mjs.orig；版本标记幂等 |
| 审计增强 | api-coverage-audit.mjs | 新增第 8 项：回放未命中记录汇总（回放期缺失直接进报告，即补采任务清单） |
| 实站补采 | workspace/bishuxiezuo/archive-bishu | 登录态刷新后跑向导四步 + 书架助手两条路径，338 → 340 条，新格式 POST（含 reqBody + 指纹 key）开始入库 |
| Skill 更新 | SKILL.md v1.3.1 | 补采 + 审计 + 回放升级三步工作流登记 |

## serve v2 行为（相对 v1）

1. 带请求体的请求先按 key 中的 sha256 指纹找变体；未中再按 URL 级宽松回退，但记 `body-variant-fallback`（拿其他变体的数据回，必须留痕）
2. 完全未命中：返回 599 + 诊断 JSON（`REPLAY_MISS=204` 回退 v1 行为），并追加 `unmatched-requests.jsonl`
3. 未改动：匹配回退链、HTML 注入、CORS、录制 5xx 回放为 200

## 验证结果（bishuxiezuo 归档实测）

| 场景 | 结果 |
|------|------|
| GET /api/books（已录制） | 200 |
| 入口页 /console/console.html | 200 text/html |
| POST /api/assistant/sessions body={}（指纹命中） | 201 |
| POST 同 URL body={"x":1}（指纹未中 → URL 回退） | 201 + body-variant-fallback 留痕 |
| POST /api/no-such（未录制） | 599 + unmatched 落盘 |
| GET /api/definitely-missing（未录制） | 599 + unmatched 落盘 |
| REPLAY_MISS=204 | 204（v1 行为可回退） |

自测中发现并修复的两个问题：
1. 升级脚本幂等守卫过松（旧 v2 也被判「已是 v2」）→ 改为显式 `serve-upgrade-version` 标记
2. 带 body 请求在精确 key 匹配即命中旧格式条目，短路指纹匹配 → 匹配链改为「有 body 先指纹」

## 遗留与下一步

1. Browser Bridge Watch Mode 接入（因果时间线）——需要装 MV3 扩展 + 起 MCP server，且探索新功能需人工参与
2. api-catalog 统一格式（bodyHash + source 最小集）未做；当前变体数据已可入库并指纹回放，catalog 属整理层
3. 旧格式 POST 条目（无 reqBody）无法指纹匹配，涉及请求体变体的功能需重采
4. serve v1 的「未命中返 204」在 bishuxiezuo 归档已被 v2 替换；新归档由 UIForge 生成仍是 v1，需跑 upgrade-replay-serve 升级
