# GUD 执行报告：gameuidatabase.com 离线克隆

- 目标站点：https://www.gameuidatabase.com/ （Game UI Database 2.0，游戏 UI 参考库）
- 执行时间：2026-11-28
- 产物位置：`workspace/gameuidatabase/`（归档与浏览器 profile 按 `.gitignore` 不入库）
- 工具：`thirdparties/UIForge/tools/uiforge-archive.mjs`（Archive 产物：保留真实 JS + 全部响应，离线回放）

## 1. 结论

首页克隆完成并可用：离线回放**零外网请求**，首屏计数、导航、搜索浮层、深色模式、20 张卡片全部正常工作，与线上视觉比对匹配度约 98%（`zai ui_diff_check` 复核：无板块缺失、无错位、无破图、字体无回退）。

## 2. 关键前置：Cloudflare 托管挑战

`curl` 直取返回 403，Playwright **headless** 同样是 `Just a moment...`。该站必须走真实 Chrome + 持久化 profile：

```bash
cd workspace/common                     # playwright 依赖在 workspace/common/node_modules
node ../thirdparties/UIForge/tools/uiforge-archive.mjs https://www.gameuidatabase.com/ \
  --out-dir ../gameuidatabase/archive \
  --profile ../gameuidatabase/chrome-profile \
  --explore
```

`--profile` 隐含 headed（UIForge 内部 `launchFor` 规则），挑战在 1 轮内自动放行。

## 3. 采集结果

- 响应总数 **117** 条：
  - 同源 `www.gameuidatabase.com` 103 条（HTML 1、CSS/JS、63 张 jpeg、24 个 svg、字体等）
  - 第三方：`cdn.jsdelivr.net` 6、`maxcdn.bootstrapcdn.com` 2、`code.jquery.com` 1、`fonts.googleapis.com` 1、`fonts.gstatic.com` 1、GTM/GA/Cloudflare Insights 各 1
- 页面数据是服务端渲染进 HTML 的（无 XHR/API 依赖），因此单页归档即可闭环；`--explore` 的热身让 lazy 图片全部落到归档里（回放 116 张图片 **0 破图**）。
- 采集日志：`workspace/gameuidatabase/capture.log`；归档清单 `archive/index.json`。
- 归档体积 6.9M（`archive/`）、profile 34M（`chrome-profile/`，仅本机保留）。

## 4. 回放服务器补丁（UIForge 原版 serve.mjs 不够用）

原版 serve.mjs 假设站点只见同源资源。本站在三处失效，已在 `workspace/gameuidatabase/serve.mjs` 修好（**这份副本是权威版本**，重采后 `cp serve.mjs archive/serve.mjs` 覆盖回去）：

| # | 问题 | 修法 |
|---|------|------|
| 1 | 第三方 CDN（bootstrap/jquery/字体）绝对 URL 在本地指向真实互联网，离线时 CSS/JS 全丢，页面退化成无样式文档 | 归档出现过的所有主机名在 HTML/CSS 响应里剥离成根相对路径（`https://cdn.jsdelivr.net/x` → `/x`），请求落到本地服务器，由 `byPath` 按 pathname 命中归档条目；顺带收敛站点自带的 `//v2logo.svg` 双斜杠 |
| 2 | 注入的冻结 `Date` 把首页数字滚动动画钉死在 0（线上 2,013 / 80,235 / 2,572 → 回放 0/0/0） | 改成偏移虚拟时钟：起点仍固定 1751328000000（可复现），之后随 `performance.now()` 正常走，动画能跑完 |
| 3 | GA/GTM/Cloudflare Insights 统计脚本离线时仍朝外网打点 | HTML 响应里直接摘掉这三类 `<script>` |

另加 `LOG_MISSES=1` 环境变量：未命中请求打到 stderr，便于看覆盖率缺口（默认未命中仍返回 204，不阻塞）。

## 5. 验收（`workspace/gameuidatabase/`）

```bash
node archive/serve.mjs                 # 默认 8787；占用时 PORT=8799 node serve.mjs
node verify-replay.mjs                 # 断外网渲染自检
node smoke-offline.mjs                 # 交互冒烟，失败退出码非 0
```

冒烟 7 项全绿：

```text
PASS  首屏计数动画完成 — Browse 2,013 Games, 80,235 Screens and 2,572 Videos
PASS  零外网请求
PASS  搜索浮层可打开
PASS  深色模式切换有响应 — (空) -> darkmode
PASS  站内链接已渲染 — 401 links
PASS  未归档路径返回非 200（可诊断） — 204
PASS  零外网请求（交互后）
```

视觉对比：`live-home.png`（线上首屏）vs `replay-offline.png`（离线整页），ui_diff_check 结论「可作为可接受的克隆」，等效匹配度 ≈98%。

## 6. 覆盖率边界（未做的部分）

- 只归档了首页。二级页（`index.php?game=…`、`index.php?set=1` 截图列表、筛选/分页结果）**未采集**，离线点击卡片/翻页会 204 空响应。
- 站点是服务端渲染 + `index.php?` 查询分页，扩面需要多页采集（可复用 bishuxiezuo 的 `capture-steps.mjs` 思路），解析式扩面不适用。
- 回放中未接 Browser Bridge 因果时间线；本站无 SSE/WebSocket，流式回放能力不需要。

## 7. 复现与后续

1. 重采：按第 2 节命令跑一遍 → `cp workspace/gameuidatabase/serve.mjs workspace/gameuidatabase/archive/serve.mjs` → 跑第 5 节两条自检。
2. 扩面（如需要）：给 `capture-steps.mjs` 加「跟随列表链接点击 N 条 + 返回」步骤，采集 `index.php?game=…` 详情页；归档条目增长后同样只需补登 `index.json`（工具自动）。
3. 经验沉淀：`dev-docs/experience/uiforge-replay-cross-origin-cdn-and-frozen-clock.md`。
