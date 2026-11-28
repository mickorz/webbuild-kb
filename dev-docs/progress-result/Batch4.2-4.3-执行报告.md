# Batch 4.2 / 4.3 执行报告：E02 世界观编辑 + E03 角色管理

阶段：Batch 4.2（E02）、4.3（E03，部分完成）
完成时间：2026-11-28

## 造数策略执行情况

| 决定 | 执行结果 |
|------|----------|
| 专用测试书籍，不碰真实书籍 | ✅ 创建 `WBTEST-E02`（id `a9379563-...`），《全球高武》全程未触碰 |
| 通过 UI 创建修改，不写数据库 | ✅ 全部经 Playwright 真实浏览器操作 |
| 不做 AI 重新生成 | ⚠️ 部分偏离：站点的**建书唯一路径**就是「铸造一个世界」向导，创建时必然触发 `world_build` AI 任务；角色表也是向导第 3 步的 AI 批量生成。未额外点击「重新抽卡」/「AI 改写」 |
| E02/E03 各一本测试书 | ⚠️ 偏离：E03 复用 WBTEST-E02（铸造已产出角色表），避免第二次铸造额度消耗；实体隔离靠 WBTEST- 前缀。已记录在 fixtures/E03-characters/fixture.json |

## E02 世界观编辑：已完成

**采集成果**（归档 426 → 519 条）
- 铸造链：`POST /api/books/<id>/task-quote` → `POST /api/engine-tasks` → `GET .../events` → `GET .../stream` → `POST .../sync`
- 世界观读取：`/world`、`/world/core_laws`、`/world/space_time`、`/world/society`、`/world/history_culture`、`/world/existence`、`/world/information`（6 组维度，共 28 个维度项）
- **关键写 API**：`PUT /api/books/<id>/world/information`，body = `{ base_version, path, value, reason }` —— 乐观并发控制；不同维度 = 同 URL 不同 body，请求体变体的典型样本

**线上行为验证（三项）**
1. 编辑维度内容 → 「完成」→ `PUT world/information` 200 → **reload 后内容持久化为 `WBTEST-测试编辑内容v1`** ✅
2. 再次编辑 → 改为 `WBTEST-取消测试内容` → Escape → **未发 PUT，reload 后仍是 v1** ✅ 取消生效
3. 编辑态 UI：`.cr-wbe-edit` → `TEXTAREA.se-ta` + 「完成」/「AI 改写」/「询问助手」

## E03 角色管理：部分完成（如实记录阻塞）

**已完成**：角色列表 + 4 个铸造生成角色（沈确/守墓人/白芷/陆尘）详情 API 入库

**阻塞原因**：角色编辑/新建/关系入口在「向导完成（世界就位）」之后的正式 console 角色界面。向导当前锁在第 3 段（故事规划），已通过的步骤不可回退（点 `.cr-stepi.done` 无效，`.cr-wbe` 区块为 0）。继续推进会**持续触发 AI 生成任务消耗额度**，故停止。

**未完成项**：WBTEST-主角/配角A/配角B 三角色、两条关系、删除验证。已在 fixture 中登记 `blocked_reason` 与 `next_steps`。

## 两个重要的实证发现

### 1. 流式端点无法用 `r.body()` 采集（E04 预判被实证）

`capture-failures.jsonl` 在实战中首次大量触发。**修正（2026-11-28 复核）**：累计 135 条的实际构成是 **132 条第三方字体（fonts.gstatic.com，跨域 CORS 使 body 不可读）+ 3 条同源 `GET /api/engine-tasks/<id>/stream`**。本文早期版本写「全部指向流式端点」有误——当时 87 条里绝大多数也是字体噪声。已修正采集器：第三方域名不再尝试采集，流式端点单独记 `stream-not-captured`。结论仍然成立：
- 站点 AI 生成走的是流式端点，不是普通响应
- 现有采集器读不到流式 body，但机制如实留痕而非静默丢弃
- E04 必须单独设计流式采集（SSE/ReadableStream 事件级），不能沿用普通 HTTP 采集验收标准

### 2. 离线回放的「GET 多版本 FIFO 起点」限制（新发现，需决策）

`/api/books`、`/world` 等 GET 端点在归档中有多个版本（建书前/后、铸造中/完成）。离线回放 FIFO 从**最早**版本开始消费：
- 回放书架里**看不到** WBTEST-E02（拿到的是建书前的列表）
- `/world` 首个响应是 `building` 态而非 `ready`

这不是 bug，是 FIFO 语义与「回放应呈现当前状态」之间的真实张力。E02 因此改为内容级 API 验证（world 结构 + 4 个维度端点 + 角色列表）。

**待决策方向**（未在本次实现）：
- 方案 A：GET/HEAD 类幂等请求默认取**最新**版本（`REPLAY_FIFO=latest`），POST/PUT 保持 FIFO
- 方案 B：FIFO 起点可配（`REPLAY_FIFO_START=0|last`）
- 方案 C：保持现状，场景需显式声明期望的版本位次

## 回归结果

**10/10 全绿**（S01-S05、E01、E02、E03、S06、S07），退出码 0。

新增场景：
- E02：world 详情结构级断言（status/engine_book_id/dimensions）+ 两个维度端点 200 + 角色列表 200
- E03：角色列表 + 沈确/白芷详情 200

## 遗留

1. E03 角色创建/编辑/关系：需向导完成或用户确认可消耗额度推进
2. GET 多版本 FIFO 起点限制（上述三方案待选型）
3. 流式采集（E04 前置）
4. 向导流程中「通过，下一步」会连环触发 AI 生成——探索时需先确认当前步骤状态，避免误触

## 归档现状（审计复核）

- 69 个去重端点、189 条 API 条目、多版本签名 25、变体冲突 28
- 异常状态 17 条，**全部是正常空态**（`/outlines/volume/latest`、`/outlines/near-term/latest` ×7、`/chapters/1` 与 `/chapters/1/guide`），非错误
- 丢弃累计 135 条 = 132 第三方字体 + 3 同源流式（修正后的分类见上；采集器已改为第三方不采集、流式单独标记）
- 文件缺失 0
