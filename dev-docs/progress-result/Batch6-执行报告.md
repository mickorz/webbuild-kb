# Batch 6 执行报告：Endpoint Replay Policy（serve v2.4）

阶段：Batch 6
完成时间：2026-11-28

## 交付

| 交付物 | 位置 | 说明 |
|--------|------|------|
| 策略文件 | `workspace/bishuxiezuo/archive-bishu/replay-policies.json` | `default: fifo` + 2 条 latest 规则 |
| 回放服务器 v2.4 | `.claude/skills/uiforge-site-clone/scripts/replay-serve-v2.mjs` | 按 method + path 模式（`:id` 单段通配）选版本 |
| 策略冒烟 | `dev-examples/replay-policy-smoke/run.mjs` | 8 项断言 |

## 语义边界（重要）

策略**只决定「同一已精确匹配签名内多版本如何选」**，不参与指纹匹配、不绕过歧义拒绝：

```
请求 → 指纹/URL 匹配 → query/body 歧义检查 → 得到同签名版本数组
                                                        ↓
                                              policy: fifo | latest
```

## 当前规则（范围严格限定，未扩大）

| method | path | mode | 理由 |
|--------|------|------|------|
| GET | `/api/books` | latest | 书架当前快照；FIFO 起点是建书前的历史版本 |
| GET | `/api/books/:id/world` | latest | 世界观当前快照；铸造过程会产生 `building` 中间态 |

`engine-tasks/*/events`、`stream`、写请求（POST/PUT/PATCH）全部保持默认 `fifo`——它们代表事件流与业务操作序列，latest 会抹掉状态变化。

## 验收结果（对应评审 6 项 + 2 项补充）

| # | 测试 | 结果 |
|---|------|------|
| 1 | 默认 FIFO 仍按旧顺序消费 | ok（`events`: queued→running→completed） |
| 2 | GET latest 每次返回最新 | ok（连续两次都是 latest，不递减） |
| 3 | GET events 保持 FIFO | ok |
| 4 | POST FIFO 多版本后钳位 | ok（1→2→2） |
| 5 | body 不匹配仍 599 | ok |
| 6 | 多 query 候选仍拒绝猜测 | ok |
| 7 | `:id` 通配规则生效 | ok（world 取 ready 而非 building） |
| 8 | 无策略文件的旧归档纯 FIFO | ok（向后兼容） |

## 实站验证（latest 的核心价值）

- 策略生效前：回放书架**看不到** WBTEST-E02（拿到建书前列表），`/world` 首版为 `building`
- 策略生效后：回放书架出现 `WBTEST-E02 | 全球高武` 两本；`/world` 为 `status=ready` + 6 组维度

## 回归 10/10（连带修复）

latest 改变了书架顺序与可见性，暴露并修复了 3 个问题：

1. **`clickCard` 祖先匹配 bug**：向上找容器时命中整个列表容器（同时含两个书名）→ 点到相邻书籍。改为「容器内必须只有 1 个 `.bc-open`」。runner 与 capture-steps 同步修正。
2. **S03/S04 依赖「第一张卡」**：改为按书名 `clickCard: 全球高武`。
3. **E01 断言基于单本书的旧实测**：在有两本书的账号上重新实测搜索行为——搜「全球」两本都可见；搜「zzz」**全球高武消失但 WBTEST-E02 仍可见**（站点自身逻辑如此）。回放与线上逐字一致，断言按实测重写。

## 遗留

1. E02 的 UI 场景暂回内容级断言：进书后 wizard 页会轮询 `engine-tasks/<id>/events?after_id=...` 与 `/stream?after_id=...`，归档中 `after_id` 有多个变体 → 触发 v2.3 歧义拒绝（599）。该端点的正确策略（事件序列 / 终态）属 Batch 7 范畴。
2. 策略目前手写；后续可由审计脚本提示候选（同签名多版本 + GET + 幂等特征）。
