# UIForge 回放的三个坑：跨域 CDN、冻结时钟、统计脚本

- 首次遇到：2026-11-28（克隆 gameuidatabase.com）
- 涉及工具：`thirdparties/UIForge/tools/uiforge-archive.mjs` 及其生成的 `archive/serve.mjs`
- 修复副本：`workspace/gameuidatabase/serve.mjs`（归档 `archive/` 不入库，重采后要用这份覆盖回去）

## 现象

用 UIForge Archive 抓 `https://www.gameuidatabase.com/` 成功后（117 条响应），离线回放三处不对：

1. 断言「断外网」时页面退化成无样式文档：Times 字体、蓝色默认链接、导航竖排展开、卡片全无 —— 与线上截图匹配度只有 10~15%。
2. 首屏计数显示 `Browse 0 Games, 0 Screens and 0 Videos`，线上是 `2,013 / 80,235 / 2,572`。
3. 即使页面看起来正常，Network 面板仍能看到 `google-analytics.com/g/collect` 往外打点，做不到「零外网请求」。

## 排查过程

1. 列出归档里的主机分布：同源 103 条，另有 `cdn.jsdelivr.net`(6)、`maxcdn.bootstrapcdn.com`(2)、`code.jquery.com`(1)、`fonts.googleapis/gstatic`(各 1)。这些资源**已经抓到**，只是回放时拿不到。
2. 读 `serve.mjs`：只有 `byKey`（精确 URL）、`byNorm`（去几类易变 query）、`byPath`（只按 pathname）三级匹配，全都在 `http://localhost:PORT` 这一origin 下生效；页面 HTML 里写的是 `https://cdn.jsdelivr.net/...` 绝对地址，浏览器直接跑外网。**工具本身没有跨域改写**（它的 showcase 站点多为同源 Next.js 应用，跨域资源只是字体，降级不可见，所以没暴露）。
3. 计数为 0：线上数字是滚动动画（按 `Date.now()` 差值推进），而 `serve.mjs` 注入的 `Date` 是**完全冻结**的常量类 → 动画永远停在起点 0。
4. 统计打点：GTM 脚本被归档了（`www.googletagmanager.com/gtag/js` 1 条），回放时它在本地正常加载，然后朝真实 `google-analytics.com` 发 collect。

## 根因

- 跨域：归档保留了绝对 URL，回放服务器没有「主机名本地化」这一步，`byPath` 的 pathname 兜底因此永远用不上。
- 时钟：可复现性（冻结时间）与依赖 `Date` 差值的动画不兼容。
- 统计：注入只中和了 `sendBeacon`/`WebSocket`，没管 `fetch` 型的 GA beacon。

## 解决方案（改 `archive/serve.mjs` 三处，见仓库内 `workspace/gameuidatabase/serve.mjs`）

```js
// 1) 主机名本地化：HTML/CSS 里把已归档主机的前缀剥掉，变成根相对路径
const archivedHosts = [...new Set(idx.entries.map(e => { try { return new URL(e.url).host } catch { return null } }).filter(Boolean))]
const localizeHosts = s => {
  for (const h of archivedHosts) for (const pre of ['https://' + h, 'http://' + h, '//' + h]) s = s.split(pre).join('')
  return s.split('="//').join('="/')   // 站点自带 https://host//x.svg，剥完要收敛成 /x.svg
}
// text/html 与 text/css 响应都过一遍（CSS 里的 fonts.gstatic.com 也要本地化）

// 2) 偏移虚拟时钟：起点固定、之后正常走
var _b=1751328000000,_t0=performance.now();var now=()=>_b+(performance.now()-_t0);
Date=class extends _d{constructor(...a){if(a.length)super(...a);else super(now())}static now(){return now()}};

// 3) 摘掉统计脚本
s.replace(/<script[^>]*(?:googletagmanager|google-analytics|cloudflareinsights)[^>]*>\s*<\/script>/gi, '')
```

结果：离线回放 0 外网请求、0 破图、计数正确，与线上首屏匹配度 ≈98%。

## 预防 / 注意事项

1. **看归档的主机分布**再决定是否要本地化：纯同源站点（如 bishuxiezuo）不需要打这个补丁；一旦看到 Bootstrap/jQuery/字体走 CDN，就必须打。
2. 本地化是「按 pathname 命中归档」，两个主机同名路径会互相覆盖；用 `LOG_MISSES=1` 观察未命中，出现意外串页再单独加白名单。
3. 冻结时间是回放的默认行为，凡是 `Date.now()` 驱动的动画/倒计时/相对时间文案都会僵住；先怀疑时钟，别怀疑数据缺失。
4. 抓取侧的 Cloudflare 站点要 `--profile`（真实 Chrome + 持久目录，隐含 headed），headless 一定卡在 `Just a moment...`。
5. 生成物 `archive/` 不入库，任何对 `serve.mjs` 的修改都要在 `workspace/<站点>/` 留一份副本，否则重采即丢。
