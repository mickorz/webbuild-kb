# Batch 7 执行报告：Stream Capture & Replay

阶段：Batch 7
完成时间：2026-11-28
额度消耗：**0**（全部用已完成任务的 SSE 重读 + 本地合成测试）

## 一、协议确认（实测，非假设）

| 端点 | 实测结果 |
|------|----------|
| `GET /api/engine-tasks/<id>/stream?after_id=N` | `text/event-stream; charset=utf-8` → **标准 SSE**，帧格式 `id: <n>\nevent: <type>\ndata: <json>` |
| `GET /api/engine-tasks/<id>/events?after_id=N` | `application/json` → 普通轮询，返回事件数组 |
| WebSocket | 页面未使用（采集器仍支持，为通用性保留） |

**关键机会**：已完成任务的 SSE 可完整重读 → 采到真实流式样本（22 帧、5 类事件）且**零 AI 额度消耗**。

真实事件序列（录制事实，非推导）：
`job_started → stage_started/stage_completed(7 组) → stage_ready(6) → job_completed`，帧间 deltaMs 记录完整。

## 二、采集：浏览器注入式（不依赖 `response.body()`）

`workspace/bishuxiezuo/stream-capture-inject.js`（`page.addInitScript` 注入，页面脚本前执行）：

| 传输 | 包装方式 | 记录内容 |
|------|----------|----------|
| fetch SSE | 包装 `window.fetch`，对 `event-stream`/`ndjson` 响应 `res.clone()` 读副本 | seq / deltaMs / 原始帧文本（含 id/event/data） |
| fetch NDJSON | 同上，按 `\n` 切分 | 同上 |
| EventSource | 包装构造器 + `message` 监听 | type / lastEventId / data |
| WebSocket | 包装构造器 + `send`/`message` | 双向帧（send/recv） |

**不干扰原应用**：clone 副本与原始 Response 并行读取，测试断言应用仍拿到完整 body。

存储与普通 API 分离：
```
archive/streams/
├── manifest.json                    # method/path/status/contentType/transport/file/frames/terminal
└── api/engine-tasks/<id>/stream.<hash>.jsonl   # 一行一帧
```

`capture-steps` 新增 `sse:<path>` 步骤（用页面 localStorage 的 token 主动拉取），普通响应的流式分支改为跳过（交给注入采集器，不再误记 failure）。

## 三、回放：事件级（serve v2.5）

- 请求到达 → 若 `method + pathname` 命中 `streams/manifest.json` → 按帧顺序 `res.write(raw + '\n\n')`，帧间 `REPLAY_STREAM_DELAY`（默认 5ms）
- 保留原始 `content-type` 与状态码，附加 `x-replay-stream: frames=N`
- 同端点多份录制取最新（流式终态语义）
- WebSocket 回放暂不支持（manifest 标 `transport=websocket` 时跳过），如实记录

## 四、验收（14 项断言，全绿）

真实 SSE 回放（`dev-examples/stream-smoke/run.mjs`）：
1. 200 + `text/event-stream`
2. 帧数与原录制一致（22）
3. 首事件 `job_started`、末事件 `job_completed`（结束事件正确）
4. **事件顺序与录制帧完全一致**（逐帧比对，不手工推导）
5. **帧原文逐字一致**（含 id/event/data 行）
6. SSE id 全部保留且唯一
7. 流式端点未计入 unmatched（事件级回放生效）

本地合成（不依赖实站）：
8. fetch-SSE 捕获 3 帧
9. fetch-NDJSON 捕获 3 帧
10. EventSource 捕获 ≥2 事件
11. WebSocket 捕获双向帧
12. 采集器不影响原应用消费

## 五、连带解决：`/events?after_id=` 歧义

E02 的 UI 场景此前被 `ambiguous-query-variant` 拦住（`after_id` 每次不同）。新增策略能力 **`ignoreQuery`**（仅对显式声明端点放宽）：

```json
{ "method": "GET", "path": "/api/engine-tasks/:id/events", "mode": "latest", "ignoreQuery": true }
```

- 命中时按 path 取最新录制批次，留痕 `policy-query-ignore`（审计可见）
- **未声明端点仍严格拒绝猜测**——策略冒烟第 7 项（多 query 候选 599）保持通过

## 六、回归 10/10

E02 恢复为 UI 场景（进书 + 向导壳渲染 + world/characters 内容级断言），10 场景全绿。

## 七、遗留与已知差异

1. **回放向导区块数少于线上**：线上进书后有 4 个 `cr-wbe` 区块（角色表步骤），回放为 0。向导步骤状态来自多个端点的多版本组合，FIFO 起点与线上当前状态不完全一致。E02 断言因此只确认「进书成功 + 向导壳渲染」，区块级待后续（可对向导状态端点补 latest/ignoreQuery）。
2. WebSocket 回放未实现（站点未使用，优先级低）。
3. `streams/manifest.json` 目前只登记显式补采的流式端点；页面自然发起的流式请求在交互采集时会自动入库。
