# API 覆盖率审计报告

- 归档: E:\WorkProjects\webbuild-kb\workspace\bishuxiezuo\archive-bishu
- 时间: 2026-11-28T03:35:48.337Z
- 总条目 338，API 条目 44，去重 API 端点 41
- API 状态分布: {"200":39,"201":1,"202":1,"204":1,"404":2}

## 端点清单（API）

| 方法 | 路径 | 状态 | 条目数 |
|------|------|------|--------|
| GET | /api/analytics/config | 200 | 1 |
| POST | /api/analytics/pageviews | 202 | 1 |
| GET | /api/announcements/unread-count | 200 | 1 |
| GET | /api/assistant/availability | 200 | 1 |
| GET | /api/assistant/capabilities | 200 | 1 |
| GET | /api/assistant/personalization | 200 | 1 |
| POST | /api/assistant/sessions | 201 | 1 |
| GET | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f | 200 | 1 |
| GET | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/checkpoint-status | 200 | 1 |
| GET | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/memory/tasks | 200 | 1 |
| GET | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/task-events | 200 | 1 |
| POST | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/welcome | 200 | 1 |
| GET | /api/auth/me | 200 | 1 |
| GET | /api/billing/me | 200 | 1 |
| GET | /api/billing/overview | 200 | 1 |
| GET | /api/books | 200 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapter-rounds | 200 | 2 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters | 200 | 2 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1 | 404 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide | 404 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/characters | 200 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/characters/%E7%BA%A2%E7%BB%AB | 200 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/characters/%E9%99%88%E7%83%AC | 200 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/characters/%E9%9C%8D%E5%A4%A9%E6%9E%A2 | 200 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/characters/%E9%AC%BC%E5%8C%BB | 200 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/outlines | 200 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/outlines/near-term/latest | 200 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/outlines/volume/latest | 200 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/prose-draw-settings | 200 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/story-plan | 200 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world | 200 | 2 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world/information | 200 | 1 |
| GET | /api/engine-tasks | 200 | 1 |
| GET | /api/notifications | 200 | 1 |
| POST | /api/notifications/popup/claim | 204 | 1 |
| GET | /api/notifications/unread-count | 200 | 1 |
| GET | /api/promotions/coupons | 200 | 1 |
| GET | /api/public/announcements/popup | 200 | 1 |
| GET | /api/runtime-status | 200 | 1 |
| POST | /api/tools/ai-rewrite/welcome | 200 | 1 |
| GET | /api/users/me/settings | 200 | 1 |

## 异常状态（>=400）

| 方法 | 路径 | 状态 | key |
|------|------|------|-----|
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide | 404 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1 | 404 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1 |

## 变体冲突（同端点多条目）

> 修复前采集的数据可能已被覆盖，条目数不代表历史全部变体；修复后按 key（含请求体指纹）区分。

| 方法 | 路径 | 条目数 | key 列表 |
|------|------|--------|----------|
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world | 2 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world?refresh=true |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters | 2 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters?refresh=true |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapter-rounds | 2 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapter-rounds?chapter_number=1&limit=20&offset=0<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapter-rounds?limit=1&chapter_number=1&offset=0 |

## POST 缺请求体记录

> 这些 POST 录制于 reqBody 字段引入之前（或本就无请求体），回放只能按 URL 匹配，无法区分请求体变体。

| 方法 | 路径 | key |
|------|------|-----|
| POST | /api/tools/ai-rewrite/welcome | POST https://bishuxiezuo.cn/api/tools/ai-rewrite/welcome |
| POST | /api/notifications/popup/claim | POST https://bishuxiezuo.cn/api/notifications/popup/claim |
| POST | /api/analytics/pageviews | POST https://bishuxiezuo.cn/api/analytics/pageviews |
| POST | /api/assistant/sessions | POST https://bishuxiezuo.cn/api/assistant/sessions |
| POST | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/welcome | POST https://bishuxiezuo.cn/api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/welcome?locale=zh-CN |

## 归档文件缺失

无

## 采集丢弃记录

无 capture-failures.jsonl（本归档采集时未产生丢弃记录，或采集于该机制引入之前）

## 补采对比缺失（--extra）

未提供 --extra，跳过（补采后传入补采归档的 index.json 即可对比）
