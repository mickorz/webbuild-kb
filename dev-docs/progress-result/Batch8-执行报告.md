# Batch 8 执行报告：Replay Fidelity

阶段：Batch 8
完成时间：2026-11-28
额度消耗：0

## 一、游标语义（P0，先实测再实现）

**实测结果**（用已完成任务的 SSE 与 JSON events 直接请求，只读）：

| 请求 | SSE `/stream` | JSON `/events` |
|------|---------------|----------------|
| `after_id=0` | 22 帧（全部） | 22 条 |
| `after_id=1241450` | 4 帧（id 1241453~1241456） | 4 条 |
| `after_id=maxId`(1241456) | 保持连接、无新事件 | **0 条** |
| `after_id=maxId+1` | 同上 | 0 条 |
| `after_id=999999`（远超范围） | 22 帧（原站回退全量，异常行为） | 22 条 |

结论：语义是 **`id > after_id`**；无新事件时原站 SSE **保持长连接**，JSON 返回空数组。

**实现（serve v2.6）**：
- SSE：`cursorFilter()` 按帧 `id:` 过滤，`after_id` 缺省/≤0 返回全部
- JSON：policy 声明 `cursor: { param: 'after_id', field: 'id' }` 的端点，按字段过滤响应数组
- 差异记录：我们无新事件时**立即空流结束**（原站保持长连接），避免离线回放挂住；`after_id` 远超范围时按确定性语义返回空，不复刻原站的全量回退异常

## 二、回放时序三模式

| 模式 | 行为 | 用途 |
|------|------|------|
| `instant`（默认） | 帧间固定 `REPLAY_STREAM_DELAY`（默认 5ms） | CI / 自动回归 |
| `recorded` | 按录制 `deltaMs` 真实间隔 | 观察线上渐进渲染 |
| `scaled` | `deltaMs × REPLAY_STREAM_SCALE`（默认 0.1） | 调试折中 |

自测抓到并修复：`gap()` 在更新 `lastT` **之后**计算，差值恒为 0，导致 recorded 模式 51ms 就结束；调整为先算间隔再更新游标，实测 recorded ≥500ms 通过。

## 三、`policy-query-ignore` 纳入审计（P1）

- `FALLBACK_KINDS` 增加 `policy-query-ignore`
- 白名单路径支持 `:id` 通配（UUID 端点无法精确登记）
- **实测生效**：首次回归即报 `[L3] fallback 白名单 — policy-query-ignore .../events?after_id=1241456`；为 E02 显式登记该端点后 10/10 通过
- 这正是期望行为：服务器留痕的宽松匹配，回归必须能看见并需显式批准

## 四、流式采集边界加固（25 项断言全绿）

| 边界 | 处理 | 验证 |
|------|------|------|
| SSE CRLF | 分帧正则 `\r?\n\r?\n` | 2 帧正确切分 |
| UTF-8 跨 chunk | `TextDecoder(stream: true)` | 中文字符跨块重组正确 |
| EventSource 自定义事件 | 包装 `addEventListener` 记录所有类型 | `stage_ready`/`stage_completed` 均入库 |
| EventSource 结束态 | `open` 不再误写 terminal，`readyState===2` 才记 `closed` | 通过 |
| WebSocket 二进制 | Blob → `arrayBuffer()` → `base64:` 保留真实字节 | 文本与二进制帧均正确 |
| 游标语义 | 见第一节 | 0 / mid / max 三档 |
| 时序模式 | 见第二节 | instant <200ms、recorded ≥500ms |

## 五、E02 4 vs 0 区块差异（专项排查，未完全解决）

产出 `dev-docs/progress-result/E02-差异报告.md`（线上 vs 回放 DOM/业务状态/API 时间线逐项对比）。

**已排除**：
1. **坐标定位**：改为点击 `.bc-open` 自身中心后，两边坐标几乎一致（104.6/378.4 vs 104.2/378.4）
2. **`/api/books` 数据**：字段级比对仅 `updated_at` 差 2 分钟，其余全等（status/role/id 一致）
3. **书籍顺序**：两边卡片标题顺序一致 `[WBTEST-E02, 全球高武]`

**残留事实**：
- 回放点击后 `lf_selected_book` 变成**全球高武**（线上正确变为 WBTEST-E02）
- 回放里应用**没有发出任何** `a9379563` 的 world/characters 请求
- 「● 在写」标记在回放里挂在全球高武身上（线上挂在 WBTEST-E02 身上），但 books 响应里无此字段差异 → 标记来自其他端点（疑 `engine-tasks` 的 latest 版本仍指向全球高武的任务）

**结论**：不是渲染或坐标 bug，而是**应用选择「当前书」的逻辑**依赖了归档中另一些端点的多版本状态。E02 因此保持「进书 + 向导壳渲染 + world/characters 内容级」断言，区块级（4 个）未达标准——**未降低验收、如实记录**。

**后续定位建议**：逐端点关闭 latest/ignoreQuery 做对照实验；或对该书单独重采一次完整会话后立即比对（消除快照时点差）。

## 六、回归

**10/10 全绿**。流式冒烟 25 项、策略冒烟 8 项全绿。

## 七、文档同步（本次修正的过期内容）

1. `dev-docs/progress/执行进度.md`：135 条失败的正确构成（132 字体 + 3 流式）、E04 状态改为已落地
2. `workspace/bishuxiezuo/regression/README.md`：serve v2.3 → v2.6、补充每场景重启隔离 FIFO、fallback 白名单含 `policy-query-ignore` 与 `:id` 通配
3. Phase 3 的 routeFromHAR 定位说明：HAR 仅作辅助对照，**不替换**自建 Replay（现有指纹匹配/多版本/歧义拒绝/SSE 事件级能力是 HAR 无法覆盖的核心）
