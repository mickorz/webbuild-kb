---
name: uiforge-site-clone
version: 1.1.0
display_name: 网站复刻抓取
display_name_en: UIForge Site Clone
description: >
  Capture a live website into a self-contained, offline-replayable UIForge
  archive (including pages behind a login), then verify the offline replay
  renders and interacts like the original. Use when the user wants to clone,
  capture, mirror, or replicate a website for offline replay or rebuild
  study (keywords: 复刻, 克隆, 抓取, 镜像网站, 离线回放), or when an existing
  UIForge replay shows a blank page, a login redirect, or broken rendering.
description_zh: >-
  用 UIForge 把目标网站（含需要登录的页面）捕获为自包含、可离线回放的 Archive，
  并在真实浏览器里验证回放的渲染与交互。适用场景：用户要求复刻、克隆、镜像、
  抓取某个网站用于离线回放或重建研究；或已有回放出现白屏、跳转登录页、渲染
  异常需要排查修复。
description_en: >-
  Capture a live website (including login-gated pages) into a self-contained,
  offline-replayable UIForge archive, and verify the offline replay renders
  and interacts like the original in a real browser. Use when the user asks
  to clone, capture, mirror, or replicate a website for offline replay or
  rebuild study, or when an existing replay shows a blank page, a login
  redirect, or broken rendering.
---

# 网站复刻抓取（uiforge-site-clone）

用 UIForge（`thirdparties/UIForge`，只读 submodule）把目标网站捕获为自包含、可离线回放的 Archive：原站真实 JS + 全部网络响应离线重放，登录站注入种子保持登录态。捕获后起本地回放服务器，在真实浏览器里验证渲染与交互。

## When to Use

- 用户要求「复刻 / 克隆 / 镜像 / 抓取」某个网站，用于离线回放或重建研究
- 已有 UIForge 归档回放时出现白屏、跳转登录页、渲染异常，需要排查修复

## Capability Boundary

- 只做 **Archive 捕获 + 回放验证**。不做 Restore（可编辑 React 还原）、不做 Freeze（像素冻结）——用户需要时提示单独执行对应 UIForge 工具链
- 不修改 `thirdparties/` 下任何子模块源码
- **登录墙必须停**：目标站需要登录时，立即停下向用户询问账号密码，等用户提供后才能继续；不得猜测凭据，memory/文档中的旧凭据也必须先向用户确认沿用
- 凭据（`credentials.json` / `auth.json`）与抓取产物（`archive-*/`）一律 gitignore，不入库、不写进文档、不内嵌进脚本源码
- 不执行「杀全部 node 进程」类命令；回放服务器占用端口/目录时按 PID 单独处理

## Workspace 布局

每站一个独立目录，共享依赖放 `common/`：

```text
workspace/
├── common/                  # 跨站点共享：package.json + node_modules（playwright）
└── <站点名>/                # 每站独立目录，所有命令在本目录内执行
    ├── credentials.json     # 该站登录凭据（gitignored）
    ├── auth.json            # storageState（gitignored）
    └── archive-<站点名>/    # 抓取产物（gitignored）
```

自有脚本从 `cwd/../common` 解析 playwright；UIForge 工具需 `NODE_PATH` 指向 `common`（见速查命令）。

## Inputs

| 输入 | 必填 | 说明 |
|---|---|---|
| 目标 URL | 是 | 登录站填登录后入口页地址；公开站填页面地址 |
| 站点目录名 | 是 | `workspace/<站点名>/`，kebab-case |
| 凭据 | 登录站必填 | 检测到登录墙时**停下向用户索要**，写入 `workspace/<站点名>/credentials.json`（gitignored） |
| 归档目录 | 否 | 默认 `workspace/<站点名>/archive-<站点名>/` |

## Main Workflow

完整分步流程（环境准备 → 探测 → 登录捕获 → 抓取 → 回放 → 白屏修复 → 交互验证）见 [references/clone-flow.md](references/clone-flow.md)。速查（均在 `workspace/<站点名>/` 下执行，`<common-abs>` 为 common 目录的绝对路径）：

```bash
# 登录站：先停下向用户索要账号密码，写入 ./credentials.json 后再执行
node ../../.claude/skills/uiforge-site-clone/scripts/login-capture.mjs --url <登录后入口页URL>

# 带登录态 + 交互预热抓取（NODE_PATH 让 UIForge 工具找到 common 里的 playwright）
NODE_PATH="<common-abs>" node ../../thirdparties/UIForge/tools/uiforge-archive.mjs <URL> --out-dir ./archive-<站点名> --explore --storage-state ./auth.json

# 起离线回放（打印 http://localhost:8787）
cd archive-<站点名> && node serve.mjs

# 仅当回放白屏且 network 出现 GET /login.html 失败时：注入 localStorage 登录态种子
cd .. && node ../../.claude/skills/uiforge-site-clone/scripts/inject-auth-seed.mjs --auth ./auth.json --files ./archive-<站点名>/files --entry <入口页相对路径，如 console/console.html>
```

## Error Policy

- **登录墙**：停下向用户索要账号密码（含 memory 中已有旧凭据的情况，需用户确认沿用），拿到后写入站点目录的 `credentials.json` 再继续；禁止自行尝试凭据
- 回放白屏 + network 有 `GET /login.html` 失败 → 登录态在 localStorage、回放 origin 没有，按 clone-flow.md 第 6 步注入种子
- `Playwright not found` → 确认 playwright 装在 `workspace/common/`；自有脚本自动解析 `cwd/../common`，UIForge 工具需 `NODE_PATH` 指向 common 绝对路径（git-bash 用 `cygpath -w`）
- 登录后抓取响应数明显偏少 → token 可能过期，重跑 `login-capture.mjs` 刷新 `auth.json`
- 完成标准：真实浏览器验证渲染正常 + 至少一个页内交互可用（参照 `docs/testing.md` 冒烟清单），并汇报响应数、交互验证结果与局限

## References

- [references/clone-flow.md](references/clone-flow.md) — 完整执行流程与排错
- [examples/bishuxiezuo-example.md](examples/bishuxiezuo-example.md) — 一次真实执行的完整参数与结果记录
