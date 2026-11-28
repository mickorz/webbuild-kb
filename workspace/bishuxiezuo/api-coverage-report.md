# API 覆盖率审计报告

- 归档: E:\WorkProjects\webbuild-kb\workspace\bishuxiezuo\archive-bishu
- 时间: 2026-11-28T08:17:27.076Z
- 总条目 519，API 条目 189，去重 API 端点 69
- API 状态分布: {"200":165,"201":4,"202":1,"204":2,"404":17}

## 端点清单（API）

| 方法 | 路径 | 状态 | 条目数 |
|------|------|------|--------|
| GET | /api/analytics/config | 200 | 1 |
| POST | /api/analytics/pageviews | 202 | 1 |
| GET | /api/announcements/unread-count | 200 | 1 |
| GET | /api/assistant/availability | 200 | 1 |
| GET | /api/assistant/capabilities | 200 | 1 |
| GET | /api/assistant/personalization | 200 | 1 |
| POST | /api/assistant/sessions | 201 | 2 |
| GET | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f | 200 | 1 |
| GET | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/checkpoint-status | 200 | 1 |
| GET | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/memory/tasks | 200 | 1 |
| GET | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/task-events | 200 | 1 |
| POST | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/welcome | 200 | 1 |
| GET | /api/auth/me | 200 | 3 |
| GET | /api/billing/capacity | 200 | 1 |
| GET | /api/billing/me | 200 | 3 |
| GET | /api/billing/overview | 200 | 1 |
| GET | /api/books | 200 | 15 |
| POST | /api/books | 201 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapter-rounds | 200 | 2 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters | 200 | 10 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1 | 404 | 1 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide | 404 | 2 |
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
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world | 200 | 4 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world/information | 200 | 1 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/chapters | 200 | 7 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters | 200 | 4 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E5%AE%88%E5%A2%93%E4%BA%BA | 200 | 2 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E6%B2%88%E7%A1%AE | 200 | 2 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E7%99%BD%E8%8A%B7 | 200 | 2 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E9%99%86%E5%B0%98 | 200 | 1 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines | 200 | 1 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest | 404 | 7 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest | 404 | 7 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/story-plan | 200 | 1 |
| POST | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/task-quote | 200 | 1 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world | 200 | 13 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world/core_laws | 200 | 1 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world/existence | 200 | 1 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world/history_culture | 200 | 1 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world/information | 200 | 2 |
| PUT | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world/information | 200 | 1 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world/society | 200 | 1 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world/space_time | 200 | 1 |
| GET | /api/engine-tasks | 200 | 21 |
| POST | /api/engine-tasks | 201 | 1 |
| GET | /api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/events | 200 | 6 |
| GET | /api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/stream | 200 | 3 |
| POST | /api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync | 200 | 3 |
| GET | /api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/events | 200 | 3 |
| GET | /api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/stream | 200 | 2 |
| POST | /api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/sync | 200 | 2 |
| GET | /api/notifications | 200 | 2 |
| POST | /api/notifications/popup/claim | 204 | 2 |
| GET | /api/notifications/unread-count | 200 | 2 |
| GET | /api/promotions/coupons | 200 | 15 |
| GET | /api/public/announcements/popup | 200 | 1 |
| GET | /api/runtime-status | 200 | 1 |
| POST | /api/tools/ai-rewrite/welcome | 200 | 1 |
| GET | /api/users/me/settings | 200 | 1 |

## 异常状态（>=400）

| 方法 | 路径 | 状态 | key |
|------|------|------|-----|
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide | 404 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide | 404 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1 | 404 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest | 404 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest |

## 变体冲突（同端点多条目）

> 修复前采集的数据可能已被覆盖，条目数不代表历史全部变体；修复后按 key（含请求体指纹）区分。

| 方法 | 路径 | 条目数 | key 列表 |
|------|------|--------|----------|
| GET | /api/auth/me | 3 | GET https://bishuxiezuo.cn/api/auth/me<br>GET https://bishuxiezuo.cn/api/auth/me<br>GET https://bishuxiezuo.cn/api/auth/me |
| GET | /api/books | 15 | GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books<br>GET https://bishuxiezuo.cn/api/books |
| GET | /api/promotions/coupons | 15 | GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons<br>GET https://bishuxiezuo.cn/api/promotions/coupons |
| GET | /api/notifications/unread-count | 2 | GET https://bishuxiezuo.cn/api/notifications/unread-count<br>GET https://bishuxiezuo.cn/api/notifications/unread-count |
| GET | /api/notifications | 2 | GET https://bishuxiezuo.cn/api/notifications<br>GET https://bishuxiezuo.cn/api/notifications |
| GET | /api/engine-tasks | 21 | GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks<br>GET https://bishuxiezuo.cn/api/engine-tasks |
| GET | /api/billing/me | 3 | GET https://bishuxiezuo.cn/api/billing/me<br>GET https://bishuxiezuo.cn/api/billing/me<br>GET https://bishuxiezuo.cn/api/billing/me |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world | 4 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world?refresh=true<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters | 10 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters?refresh=true<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters?refresh=true<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters |
| POST | /api/notifications/popup/claim | 2 | POST https://bishuxiezuo.cn/api/notifications/popup/claim<br>POST https://bishuxiezuo.cn/api/notifications/popup/claim#b0438b42e0c2 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapter-rounds | 2 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapter-rounds?chapter_number=1&limit=20&offset=0<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapter-rounds?limit=1&chapter_number=1&offset=0 |
| GET | /api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide | 2 | GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide<br>GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide |
| POST | /api/assistant/sessions | 2 | POST https://bishuxiezuo.cn/api/assistant/sessions<br>POST https://bishuxiezuo.cn/api/assistant/sessions#44136fa355b3 |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest | 7 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters | 4 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/chapters | 7 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/chapters<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/chapters<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/chapters<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/chapters<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/chapters<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/chapters<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/chapters |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest | 7 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world | 13 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world?refresh=true<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world?refresh=true<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world?refresh=true<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world?refresh=true<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world?refresh=true<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world?refresh=true |
| GET | /api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/events | 3 | GET https://bishuxiezuo.cn/api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/events<br>GET https://bishuxiezuo.cn/api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/events?after_id=1241405<br>GET https://bishuxiezuo.cn/api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/events?after_id=1241423 |
| GET | /api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/stream | 2 | GET https://bishuxiezuo.cn/api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/stream?after_id=1241405<br>GET https://bishuxiezuo.cn/api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/stream?after_id=1241423 |
| POST | /api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/sync | 2 | POST https://bishuxiezuo.cn/api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/sync<br>POST https://bishuxiezuo.cn/api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/sync |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world/information | 2 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world/information<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world/information |
| GET | /api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/events | 6 | GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/events<br>GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/events?after_id=1241608<br>GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/events?after_id=1241617<br>GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/events<br>GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/events<br>GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/events?after_id=1241635 |
| GET | /api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/stream | 3 | GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/stream?after_id=1241608<br>GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/stream?after_id=1241617<br>GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/stream?after_id=1241635 |
| POST | /api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync | 3 | POST https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync<br>POST https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync<br>POST https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E6%B2%88%E7%A1%AE | 2 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E6%B2%88%E7%A1%AE<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E6%B2%88%E7%A1%AE |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E5%AE%88%E5%A2%93%E4%BA%BA | 2 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E5%AE%88%E5%A2%93%E4%BA%BA<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E5%AE%88%E5%A2%93%E4%BA%BA |
| GET | /api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E7%99%BD%E8%8A%B7 | 2 | GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E7%99%BD%E8%8A%B7<br>GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E7%99%BD%E8%8A%B7 |

## POST 缺请求体记录

> 这些 POST 录制于 reqBody 字段引入之前（或本就无请求体），回放只能按 URL 匹配，无法区分请求体变体。

| 方法 | 路径 | key |
|------|------|-----|
| POST | /api/tools/ai-rewrite/welcome | POST https://bishuxiezuo.cn/api/tools/ai-rewrite/welcome |
| POST | /api/notifications/popup/claim | POST https://bishuxiezuo.cn/api/notifications/popup/claim |
| POST | /api/analytics/pageviews | POST https://bishuxiezuo.cn/api/analytics/pageviews |
| POST | /api/assistant/sessions | POST https://bishuxiezuo.cn/api/assistant/sessions |
| POST | /api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/welcome | POST https://bishuxiezuo.cn/api/assistant/sessions/e7f44f7d-c45f-4eec-b7c9-cc29cbc2133f/welcome?locale=zh-CN |
| POST | /api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/sync | POST https://bishuxiezuo.cn/api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/sync |
| POST | /api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/sync | POST https://bishuxiezuo.cn/api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/sync |
| POST | /api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync | POST https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync |
| POST | /api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync | POST https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync |
| POST | /api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync | POST https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync |

## 同签名多响应版本（FIFO）

> 同一请求签名录到多个不同响应（不同业务状态），回放按 FIFO 顺序消费，超出后停在最后一版。

| key | 版本数 |
|-----|--------|
| GET https://bishuxiezuo.cn/api/auth/me | 3 |
| GET https://bishuxiezuo.cn/api/books | 15 |
| GET https://bishuxiezuo.cn/api/promotions/coupons | 15 |
| GET https://bishuxiezuo.cn/api/notifications/unread-count | 2 |
| GET https://bishuxiezuo.cn/api/notifications | 2 |
| GET https://bishuxiezuo.cn/api/engine-tasks | 21 |
| GET https://bishuxiezuo.cn/api/billing/me | 3 |
| GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/world | 3 |
| GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters | 8 |
| GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters/1/guide | 2 |
| GET https://bishuxiezuo.cn/api/books/2de6cf8f-9b82-4edd-92d1-e0b6611546ec/chapters?refresh=true | 2 |
| GET https://fonts.googleapis.com/css2?display=swap&family=Noto+Sans+SC%3Awght%40300%3B400%3B500%3B600%3B700&family=Noto+Serif+SC%3Awght%40400%3B500%3B600%3B700&family=Newsreader%3Aital%2Copsz%2Cwght%400%2C6..72%2C400%3B0%2C6..72%2C500%3B1%2C6..72%2C400%3B1%2C6..72%2C500 | 2 |
| GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/volume/latest | 7 |
| GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters | 4 |
| GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/chapters | 7 |
| GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/outlines/near-term/latest | 7 |
| GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world | 7 |
| POST https://bishuxiezuo.cn/api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/sync | 2 |
| GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world?refresh=true | 6 |
| GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/world/information | 2 |
| GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/events | 3 |
| POST https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/sync | 3 |
| GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E6%B2%88%E7%A1%AE | 2 |
| GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E5%AE%88%E5%A2%93%E4%BA%BA | 2 |
| GET https://bishuxiezuo.cn/api/books/a9379563-e534-4ed3-8996-78b31b1d1bb0/characters/%E7%99%BD%E8%8A%B7 | 2 |

## 请求体截断（reqBodyTruncated）

无

## 归档文件缺失

无

## 采集丢弃记录

来源: capture-failures.jsonl，共 135 条

| kind | 数量 |
|------|------|
| response-body-unreadable | 135 |

涉及请求:

- GET https://bishuxiezuo.cn/api/engine-tasks/ede1a766-b7b6-48db-af5c-d851404a637e/stream?after_id=1241446
- GET https://fonts.gstatic.com/s/newsreader/v26/cY9CfjOCX1hbuyalUrK439vCjohC.woff2
- GET https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK4397yjA.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.28.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.35.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.47.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.59.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.80.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.83.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.84.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.100.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.101.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.103.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.104.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.105.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.106.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.107.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.108.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.109.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.110.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.111.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.112.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.113.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.114.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.115.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.116.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.117.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.118.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.119.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALRLoKI.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.102.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.104.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.106.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.108.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.110.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.112.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.113.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.114.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.115.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.116.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.117.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.118.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.119.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7kqGWbg.woff2
- GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/stream?after_id=1241649
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.57.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.68.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.79.woff2
- GET https://fonts.gstatic.com/s/notosanssc/v41/k3kXo84MPvpLmixcA63oeALhLOCT-xWNm8Hqd37g1OkDRZe7lR4sg1IzSy-MNbE9VH8V.102.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.105.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.107.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.109.woff2
- GET https://fonts.gstatic.com/s/notoserifsc/v36/H4chBXePl9DZ0Xe7gG9cyOj7oqP0dTpxZbB9E9gjjmzKvaeKHUTtJDWv3z-us4bxD8F5og.111.woff2
- GET https://bishuxiezuo.cn/api/engine-tasks/6a7c9720-4eb8-4c73-86c8-8bd1373a08f1/stream?after_id=1241654

## 回放未命中记录（serve v2）

无（未运行过 serve v2 回放，或回放全命中）

## 补采对比缺失（--extra）

未提供 --extra，跳过（补采后传入补采归档的 index.json 即可对比）
