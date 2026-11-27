# 操作指南

## 抓取需要登录的站点（UIForge Archive）

场景：目标页面在登录后才渲染真实数据，匿名抓取只能拿到登录页。

1. 建站点目录：`mkdir -p workspace/<站点名> && cd workspace/<站点名>`；共享依赖已在 `workspace/common/`（首次见 getting-started）
2. 检测到登录墙时，**停下来向用户索要账号密码**（禁止猜测或沿用旧凭据，需用户确认），写入本站 `credentials.json`：`{ "email": "...", "password": "..." }`
3. 登录并保存会话：`node ../../.claude/skills/uiforge-site-clone/scripts/login-capture.mjs --url <登录后入口页URL>`（生成 `auth.json`，脚本内会校验密码框是否消失）
4. 带登录态抓取（`NODE_PATH` 让工具找到 common 里的 playwright，git-bash 下用 `cygpath -w` 取绝对路径）：
   `NODE_PATH="$(cygpath -w "$(pwd)/../common")" node ../../thirdparties/UIForge/tools/uiforge-archive.mjs <url> --out-dir ./archive-x --explore --storage-state ./auth.json`
5. 启动回放：`cd archive-x && node serve.mjs`
5. 若回放白屏且控制台显示跳转 `login.html` 失败——登录态在 localStorage、回放 origin 没有它。把 `auth.json` 里 `origins[].localStorage` 的键值做成种子脚本注入镜像内入口 HTML（`<body>` 后第一个 `<script>`，循环 `localStorage.setItem`），刷新即恢复登录渲染。

预期结果：离线回放渲染登录后界面，页内交互（选项卡、编辑表单等）可用——跑的是原站真实 JS + 缓存数据。

## 引入新的第三方子模块并登记

1. `git submodule add <仓库地址> thirdparties/<项目名>`
2. `git -C thirdparties/<项目名> rev-parse HEAD` 取固定 commit，读 LICENSE 确认协议
3. 在 `thirdparties/REFERENCES.md` 表格新增一行（REF 编号连续）
4. 一并提交：`.gitmodules`、submodule gitlink、`REFERENCES.md`

## 用 browser-bridge 让 AI 代理操作真实 Chrome

见 `thirdparties/browser-bridge/README.md`（MCP 服务器 + 扩展安装与工具清单）。

## 升级某个子模块

`git submodule update --remote thirdparties/<项目名>`，然后更新 REFERENCES.md 的固定 commit 列并提交。
