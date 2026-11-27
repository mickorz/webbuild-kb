# 示例：bishuxiezuo.cn 创作控制台完整复刻（2026-11-27 真实执行记录）

## 目标

复刻 `https://bishuxiezuo.cn/console/console.html`（笔枢 NOVELBUILT 创作控制台，登录后才有真实数据）为可离线回放的 UIForge Archive。

## 执行参数

| 参数 | 值 |
|---|---|
| 目标 URL | `https://bishuxiezuo.cn/console/console.html` |
| 凭据 | `workspace/credentials.json`（gitignored） |
| 登录脚本 | `login-capture.mjs --url https://bishuxiezuo.cn/console/console.html` |
| 抓取命令 | `node ../thirdparties/UIForge/tools/uiforge-archive.mjs https://bishuxiezuo.cn/console/console.html --out-dir ./archive-bishu --explore --storage-state ./auth.json` |
| 注入命令 | `node ../.claude/skills/uiforge-site-clone/scripts/inject-auth-seed.mjs --auth ./auth.json --files ./archive-bishu/files --entry console/console.html` |
| 回放 | `cd archive-bishu && node serve.mjs` → http://localhost:8787 |

## 关键中间结果

- 匿名抓取仅 163 响应（回放为登录页）；登录态抓取 **277 响应（208 个 data/API 载荷）**
- 登录态载体：cookies 仅 1 个统计 cookie，**真实 token 在 localStorage**（`novelbuilt.tokens`、`lf_tokens` 等 11 个键，origin 为 `https://bishuxiezuo.cn`）
- 首次回放白屏，network 面板 `GET /login.html` ERR（镜像无此文件）→ 注入种子后恢复

## 验证结果

- 回放渲染登录后控制台：用户 test 书架、「晚上好，test。」欢迎语、《全球高武》作品卡（0 章 0 字）、主题/语言切换控件
- 交互验证：点击作品卡「编辑」弹出书名/题材/字数区间编辑表单——原站真实 JS 跑在缓存数据上
- 控制台无阻塞性报错（仅 TrustedHTML report-only 提示）

## 局限

- 未探索到的交互（如写作编辑器深度功能）其 API 数据未录进归档，离线触发时可能缺数据
- token 有过期时间，失效后重跑 login-capture.mjs 并重新抓取
- 本例归档目录 `workspace/archive-bishu/` 与 `auth.json` 均已 gitignore，不入库
