# Troubleshooting

## Installation

**`git submodule status` 出现 `+` 前缀**：子模块 HEAD 与固定 commit 不一致，执行 `git submodule update --init --recursive` 还原。

**Playwright not found 报错**：playwright 装在 `workspace/common/`。自有脚本自动解析 `cwd/../common`；直接调用 UIForge 工具时需设 `NODE_PATH` 为 common 绝对路径（git-bash：`NODE_PATH="$(cygpath -w "$(pwd)/../common")"`）。

## Runtime

**回放白屏，控制台出现 `GET /login.html` 失败**：页面 JS 登录校验失败要跳登录页，而回放 origin 没有 localStorage 登录态。解决：把抓取时保存的 `auth.json` 中 localStorage 键值做成种子脚本注入镜像内入口 HTML（见 how-to-guides.md 第 5 步）。

**回放渲染成登录页**：抓取时没带 `--storage-state ./auth.json`，重新抓取。

**端口 8787 被占用 / 目录删不掉（Device or resource busy）**：上次起的 `serve.mjs` 还在运行。找到对应 PID（`netstat -ano | grep 8787`）后 `taskkill //F //PID <pid>`，不要杀全部 node 进程。

**登录后抓取的响应数明显偏少**：`--explore` 未开启或登录态失效。先重跑 login-capture.mjs（uiforge-site-clone 技能脚本）刷新 `auth.json`，再带 `--explore` 重抓。

## Still Stuck

先查 `dev-docs/experience/` 是否有同类踩坑记录；没有的话解决后把过程沉淀进去。仍未解决可在 GitHub 提 issue：https://github.com/mickorz/webbuild-kb/issues
