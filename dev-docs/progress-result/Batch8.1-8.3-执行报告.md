# Batch 8.1/8.2/8.3 执行报告：游标收尾加固与 E02 根因定位

阶段：Batch 8.1（recorded+游标时间基准）、8.2（JSON 事件游标测试）、8.3（E02 选中书籍定位，限时）
完成时间：2026-11-28
额度消耗：0

## 8.1 recorded + 游标的时间基准（真 bug，已修）

**问题**：`cursorFilter` 之后 `lastT` 仍为 0，而帧的 `deltaMs` 是相对录制起点的绝对值。请求 `after_id=2`（事件 C@400ms、D@600ms）时，首帧会白等 400ms 才发出。

**修复**：过滤后以首帧 `deltaMs` 作为新基准
```js
let lastT = frames.length ? (frames[0].deltaMs || 0) : 0
```

**验证**（合成 4 帧 @0/200/400/600ms）：
- `recorded` 全量：≥500ms ✅
- `recorded` + `after_id=2`：2 帧（C/D），耗时约 200ms（**不是 400ms+**）✅

## 8.2 JSON 事件游标测试（并抓出第二个真 bug）

**新发现 bug**：`policyFor()` 返回对象只带 `{mode, ignoreQuery}`，**漏传 `cursor`** → JSON 游标过滤从未生效（笔枢 `/events` 的游标配置一直是死配置）。已修。

**同时加固基础数据选择**：游标端点与流式端点都改为取「事件/帧数最多」的那份录制，避免把已被游标截断的历史响应当作全集二次过滤（`fullestFor` / `streamFor` 改 max）。

新增 `dev-examples/json-cursor-smoke/run.mjs`，6 项断言全绿：

| 请求 | 期望 | 结果 |
|------|------|------|
| `after_id=0` | 完整 6 条 | ok |
| `after_id=3` | 仅后续 3 条（4,5,6） | ok |
| `after_id=maxId` | 空数组 | ok |
| `after_id=999` | 空数组 | ok |
| 基础数据选择 | 取最全集（未被 after_id=4 的截断样本污染） | ok |
| 非游标端点 | 数组原样返回 | ok |

## 8.3 E02 选中书籍定位（限时，已出根因）

按建议做了实验 A/B，并进一步读了归档里的应用源码。

### 实验 A：加载前注入 `lf_selected_book = WBTEST-E02`

**结果：注入被覆盖**。`+1243ms` 时被改回全球高武，写入栈：

```
+1243ms  a9379563 → 2de6cf8f  |  console.html:63（内联脚本）
+1464ms  2de6cf8f → 2de6cf8f  |  persistSelectedBook (api-bridge.js:251)
                                commitBookSnapshot (api-bridge.js:3163)
                                loadPortalSnapshot
```

进一步验证：
- 注入线上 `lf_portal_snapshot`（33KB）**仍然无效**
- 回放 `/api/books` latest 顺序**正确**（`WBTEST-E02@09:27 | 全球高武@07:58`，第一本就是要选的书）

### 根因（源码证据）

`api-bridge.js` 内注释：

> `// Monotonic load token: switching books fires overlapping loadPortalSnapshot`
> `// calls; only the most recent one may apply, otherwise a slow stale response`
> `// for the previous book clobbers the freshly selected book's data.`

应用用**加载序号（loadSeq）做竞态保护**，其正确性依赖各响应**完成的先后顺序**——也就是真实网络延迟。回放把响应变成近零延迟，同时发起的两条 `loadPortalSnapshot` 完成顺序改变，于是「旧书（全球高武）的快照」在序号上赢了，覆盖了新选中的书。

**这解释了全部现象**：为什么注入 id 无效（启动期被覆盖）、为什么注入 portal 快照无效（快照本身被 commitBookSnapshot 重写）、为什么线上正常（真实延迟给出了期望顺序）。

### 结论与后续动作（未在本批实现）

这不是 Replay Policy 配置问题，而是**普通 API 的时序保真**问题——与流式的 `recorded` 模式同源。修复方向（择一）：

1. **按录制顺序串行化响应**：同一路径族（`/api/books*`）的响应按录制时序落地，保证加载序号语义一致
2. **可配延迟**：`REPLAY_LATENCY_MS` / 按端点延迟表，让并发请求的完成顺序与录制时一致
3. **序列号感知**：识别应用内 loadSeq 模式后按录制顺序重放（站点特定，优先级低）

建议优先做 2（成本最低、通用），并在 E02 场景恢复区块级断言后验证。

## 验证汇总

| 套件 | 结果 |
|------|------|
| stream-smoke | 27 项（含 recorded+游标组合）全绿 |
| json-cursor-smoke | 6 项全绿 |
| policy-smoke | 8 项全绿 |
| replay 回归 | 10/10 |

## 附：实验脚本产物不再污染仓库

`dev-examples/**/tmp*/`、`.run*/` 已加入 .gitignore；8.3 的定位脚本输出到 `.run/` 并结束时清理。
