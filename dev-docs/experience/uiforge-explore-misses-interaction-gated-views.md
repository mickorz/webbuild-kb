# uiforge-archive --explore 覆盖不到的交互界面（需步骤抓取补录）

日期：2026-11-28

## 问题现象

bishuxiezuo.cn 控制台的「铸造一个世界」向导视图（`cr-shell`，含 `.cr-wbe` 结构化编辑卡片：询问助手 / AI 改写 / 完成 按钮）在离线回放里完全不出现：手动点「世界 → 重新编辑世界观 → 进入编辑」后，视图仍停在 `cscreen`，`cr-wbe` 数量为 0。

## 排查过程

1. 核对镜像完整性：`console.html` 引用的 229 个脚本/CSS 全部在档，无缺失
2. 核对脚本内容：`editable.js`、`console.css` 与线上逐字节一致，**不是代码缺失**
3. 核对 API：回放里 `/api/auth/me`、`/api/books` 等全部返回 **401** → 归档里的登录态 token 已于 2026-11-27T08:47Z 过期，抓取时录到的就是 401
4. 重新登录（新 token 仅 30 分钟）后再抓：API 全部 200，书架/世界总览页数据正常
5. 但向导视图仍不出现 → 用线上站点对照，发现进入向导的正确路径是
   `打开(.bc-open) → 侧栏[title="世界"] → 重新编辑世界观 → 进入编辑`（第 4 步有个确认弹窗）
6. UIForge 的 `--explore` 只点文本匹配 `more|load|show|next|prev|tab|filter|sort` 的按钮，且明确避开 `<a href>`。上面这些按钮文本是中文「重新编辑世界观」「进入编辑」，**不在预热范围内**，所以向导分支的 API 响应从未被录制

## 根因

`--explore` 的自动预热是启发式的，覆盖不到「需要多步中文按钮导航才能到达的子视图」。这类界面的数据请求没被录进归档，回放时拿不到数据 → 视图不切换（且不报错，静默停在上一屏）。

## 解决方案

用 `workspace/<站点>/capture-steps.mjs` 做**步骤抓取**：给定选择器/按钮文本序列，边点边录响应，把结果合并进已有归档（同 URL 以新录为准，文件写 `files/_steps/`）。

```bash
node capture-steps.mjs --out ./archive-bishu --state ./auth.json \
  --url https://bishuxiezuo.cn/console/console.html \
  --step ".bc-open" --step '[title="世界"]' --step "重新编辑世界观" --step "进入编辑"
```

本次补录新增 31 条响应（328 条总数），回放里向导正常出现：`cr-shell`、`cr-wbe=9`；点「编辑」后 `.cr-wbe-ehead` 出现，询问助手 / AI 改写 / 完成 三按钮齐备。

## 预防/注意事项

- **token 会过期**：抓取前先确认 `auth.json` 里 access_token 的 `exp`，过期就重跑登录；录到 401 的归档回放必失败
- 抓完先查 `index.json` 里的 API 状态分布，出现 401 说明登录态没生效，别急着排查前端
- 判断「某功能没复刻」的顺序：先看 API 状态码 → 再看是否需要多步导航 → 最后才怀疑代码缺失
- 步骤抓取脚本要复用同一份 `storageState`，否则跨会话状态不一致
