# clone-flow — 网站复刻抓取完整流程

从零到「离线回放验证通过」的完整步骤。

## 工作区布局

```text
workspace/
├── common/                  # 跨站点共享：package.json + node_modules（playwright）
└── <站点名>/                # 每站一个独立目录，所有命令在本目录内执行
    ├── credentials.json     # 该站登录凭据（gitignored）
    ├── auth.json            # storageState（gitignored）
    ├── archive-<站点名>/    # 抓取产物（gitignored）
    └── serve.log            # 回放服务器日志（gitignored）
```

所有命令默认在 `workspace/<站点名>/` 目录下执行：自有脚本从 `cwd/../common` 解析 playwright；UIForge 工具需 `NODE_PATH` 指向 `common`（见第 3 步）。

## 第 0 步：环境准备（一次性）

```bash
cd workspace && mkdir -p common && cd common
npm init -y
npm i -D playwright
npx playwright install chromium
```

检查仓库根 `.gitignore` 已包含以下条目（缺失则补）：

```text
workspace/*/auth.json
workspace/*/credentials.json
workspace/*/inject-ls.json
workspace/*/archive-*/
workspace/*/serve.log
```

> 原因：`auth.json` 含登录 token、`credentials.json` 含明文凭据、`archive-*/` 含抓取到的用户数据，全部不允许入库。

## 第 1 步：建站点目录并判断是否需要登录

```bash
cd workspace && mkdir -p <站点名> && cd <站点名>
```

任选其一快速探测目标站：

- `curl -s <URL> | grep -i "login\|登录"` —— 页面源码直出登录表单说明该 URL 是登录页
- 匿名快速抓取一次（不带 storage-state），回放看渲染结果

**硬性策略：检测到登录墙必须立即停下，向用户询问该站的账号密码，等用户提供后才能继续。**

- 不要自行猜测、拼接或尝试凭据
- agent memory 或文档中存有同站旧凭据时，也必须先向用户确认是否沿用，确认后才能写入
- 用户提供凭据后，写入本站点目录的 `credentials.json`（gitignored）：

```json
{ "email": "user@example.com", "password": "..." }
```

**禁止**把凭据写进脚本源码、文档或任何 git 跟踪的文件。

公开站（无登录墙）跳过本步，直接进第 3 步（命令去掉 `--storage-state`）。

## 第 2 步：登录捕获（生成 auth.json）

```bash
node ../.claude/skills/uiforge-site-clone/scripts/login-capture.mjs --url <登录后入口页URL>
```

> 技能目录相对仓库根固定；从 `workspace/<站点名>/` 运行时路径为 `../../.claude/skills/uiforge-site-clone/scripts/login-capture.mjs`，下同以仓库内实际相对路径为准。

脚本行为：打开页面 → 填邮箱密码框 → 点登录按钮（默认匹配 `登录|Sign in|Log in`，可用 `--button-text` 覆盖）→ 等待加载 → 校验密码框是否消失 → 保存在当前站点目录的 `auth.json`。

- 密码框仍存在（退出码 2）→ 凭据错误或表单结构不同：**回到用户处核对凭据**，必要时人工打开页面确认表单选择器
- 成功标志：输出的「密码框仍存在」为 0，且 URL 停在入口页

## 第 3 步：带登录态抓取 Archive

```bash
NODE_PATH="$(cygpath -w "$(pwd)/../common")" \
node ../../thirdparties/UIForge/tools/uiforge-archive.mjs <URL> --out-dir ./archive-<站点名> --explore --storage-state ./auth.json
```

- `NODE_PATH` 必须设为 `common` 的绝对路径（git-bash 下用 `cygpath -w` 转换）：UIForge 工具从 cwd 与 NODE_PATH 解析 playwright，站点目录内没有 node_modules
- `--explore` 必须加：抓取过程中自动滚动、点击页内控件，把这些交互触发的 API 数据也录进归档——探索越多，离线回放可用的交互越多
- 结束后关注输出的响应数（scripts/css/data-API/fonts/images 分类计数），登录后抓取的 data/API 载荷应明显多于匿名抓取；明显偏少说明 token 失效，重跑第 2 步

## 第 4 步：起回放服务器并用默认浏览器打开

```bash
cd archive-<站点名> && node serve.mjs
```

输出 `UIForge replay → http://localhost:8787`。**起服务后立即用默认浏览器打开回放页给用户看**：

```bash
cmd //c start "" http://localhost:8787/console/console.html   # git-bash 写法；cmd 内为 start "" <URL>
```

bishuxiezuo 归档有速启脚本：仓库根 `open.bat`（检查 8787 未占用才启动服务器，然后打开默认浏览器，双击即可用）。

端口占用或目录删不掉（`Device or resource busy`）→ 上次的 serve.mjs 还在跑：`netstat -ano | grep 8787` 找 PID，`taskkill //F //PID <pid>` 单独处理，**禁止杀全部 node 进程**。

镜像在 `files/` 下按真实 URL 路径存放（真实文件名与扩展名），服务器每次请求读最新文件——改镜像内文本，刷新即生效。

## 第 5 步：回放验证（渲染）

真实浏览器打开回放 URL，检查三项：

1. `document.getElementById('root')`（或等价挂载点）内容非空、标题正确
2. 渲染的是目标页面而非登录页
3. 控制台无阻塞性 JS 报错

## 第 6 步：白屏修复（仅登录站需要）

**症状**：抓取正常（响应数多）但回放全白，network 面板出现 `GET http://localhost:8787/login.html` 失败（ERR）。

**根因**：站点 JS 启动时校验 localStorage 里的 token，失败则跳登录页。`--storage-state` 只在抓取时的 Playwright 上下文生效；回放用的是用户自己的浏览器，其 origin（localhost:8787）没有这些 localStorage 键 → 校验失败 → 跳 `login.html` → 镜像里没有该文件 → 404 → 白屏。详见 `dev-docs/experience/uiforge-replay-login-localstorage-whitepage.md`。

**修复**：把 `auth.json` 里 localStorage 键值做成种子脚本注入镜像入口 HTML（从站点目录运行）：

```bash
cd ..   # 回到 workspace/<站点名>/
node ../../.claude/skills/uiforge-site-clone/scripts/inject-auth-seed.mjs \
  --auth ./auth.json --files ./archive-<站点名>/files --entry <入口页相对路径>
```

`--entry` 是入口 HTML 在 `files/<域名>/` 下的相对路径（如 `console/console.html`）。脚本幂等：已注入自动跳过。刷新回放页面即可看到登录后界面。

## 第 7 步：交互验证与收尾

- 在回放页面至少真实点击一个交互（选项卡、编辑按钮、下拉等），确认弹出/切换的是预期内容——离线回放跑的是原站真实 JS + 缓存数据，交互应与原站一致
- 汇报：归档路径、响应数、验证结果（渲染 + 交互）、局限（未探索到的交互其 API 数据可能缺失、token 有过期时间）
- 可选下一步：可编辑代码版用 Restore 工具链（`uiforge-detect → uiforge-sourcemap → uiforge-restore`），像素冻结用 `uiforge-freeze`
- **敏感数据**：归档目录含登录态种子和用户数据，确认未被 git 跟踪后再提交任何文件
