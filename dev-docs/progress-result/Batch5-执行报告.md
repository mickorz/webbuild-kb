# Batch 5 执行报告：Replay Regression MVP

阶段：Batch 5（自动回放回归，只做 bishuxiezuo，不做通用测试平台，不接 Browser Bridge，不引入第二套回放引擎）
完成时间：2026-11-28

## 交付清单

| 交付物 | 位置 | 说明 |
|--------|------|------|
| 回归 Runner | workspace/bishuxiezuo/regression/replay-regression.mjs | 场景调度、临时副本、独立端口/上下文、离线守卫、L1-L4 断言、失败证据、非零退出码 |
| 场景定义 | workspace/bishuxiezuo/regression/scenarios.json | S01-S07 七组场景（5 页面 + 2 API） |
| 覆盖率报告 | regression/report/ReplayCoverageReport.md | 7/7 通过；unmatched/歧义/回退留痕计数 |
| README | regression/README.md | 用法、约束、断言分层、与 Batch 4 的配合流程 |

## 七组场景结果（2026-11-28 实测 7/7 通过，退出码 0）

| 场景 | 类型 | 关键断言（内容级，非仅状态码） |
|------|------|------|
| S01 入口 | page | `.bc-open` 可见；`/api/auth/me` 200 且 id/email 字段存在 |
| S02 书架 | page | 页面出现「全球高武」；`/api/books[0].title`、`[0].id` 精确匹配 |
| S03 世界观 | page | 两步点击后出现「重新编辑世界观」；world API 200 |
| S04 向导 | page | 四步导航后 `.cr-shell` 出现、`[class*=cr-wbe]` ≥ 1 |
| S05 助手 | page | 页面出现「笔枢助手」；`POST sessions` 201，`messages[0].content` 含「笔枢助手」 |
| S06 并发 FIFO | api | 并发 6 次同签名请求全部 201 且响应确定（单版本钳位） |
| S07 异常诊断 | api | 未录制 599、歧义 body 599，且 unmatched 留痕 kind 齐全 |

多版本并发确定性在 replay-v23 冒烟补齐：双版本签名并发 4 次 → 消费结果 `[101,102,102,102]`（各消费一次后钳位，无重复无跳版）。

## 断言体系（L1-L4）

- **L1 页面**：选择器可见 / 页面文本 / 元素计数
- **L2 API**：状态码 + JSON 字段（dot-path，`present` / `contains:` 前缀）。字段断言用**直接重放**而非浏览器回调捕获，保证确定性（期间修掉 getp 对 `messages[0].content` 嵌套下标的解析 bug）
- **L3 匹配**：unmatched-requests.jsonl 增量 kind 检查（默认禁 `unmatched` / `ambiguous-*`）；并发 FIFO 确定性
- **L4 完整性**：原站泄漏（离线守卫拦截，命中即失败）、JS 错误上限、404 必须为录制态、第三方依赖拦截记录不失败

## 关键工程决策与自测发现

1. 离线守卫分级：**原站域名请求被拦 → 失败**；第三方（Google Fonts 等）被拦 → 记录不失败——离线副本的字体依赖是已知状态，不应红报告
2. console 错误只计 JS 异常类：`Failed to load resource: net::ERR_FAILED` 是拦截第三方造成，404 资源错误由「404 均为录制态」专项检查接管（对应审计异常清单里的 `chapters/1`、`chapters/1/guide` 两条真实录制 404）
3. 自测修复：freePort 事件名写错（`listen` → `listening`）导致整体挂起；场景循环漏定义 `ev`；dom count 检查用错键；并发 FIFO 测试初版误用在已消费签名上（`[2,2,2,2]` 恰是正确钳位行为，改用全新签名验证）

## 遗留与下一步

1. Batch 4 人工探索补采后，把新功能加入 scenarios.json 即获得回归覆盖（流程见 regression/README.md）
2. 场景覆盖仍偏入口链路；搜索/筛选/分页、世界观增删改、上传下载等操作型场景待 Batch 4 数据就位后补充
3. Runner 目前 bishuxiezuo 专用（场景内含站点选择器），多站复用时再抽象通用层
