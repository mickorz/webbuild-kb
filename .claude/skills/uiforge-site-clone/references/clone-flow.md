# clone-flow — 网站复刻抓取完整流程

从零到「离线回放验证通过」的完整步骤。所有命令默认在仓库根的 `workspace/` 目录下执行（Playwright 从 cwd 解析，见第 0 步）。

## 第 0 步：环境准备（一次性）

```bash
cd workspace
npm init -y          # 已有 package.json 则跳过
npm i -D playwright
npx playwright install chromium
```

检查仓库根 `.gitignore` 已包含以下条目（缺失则补）：

```text
workspace/auth.json
workspace/credentials.json
workspace/inject-ls.json
workspace/archive-*/
workspace/serve.log
```

> 原因：`auth.json` 含登录 token、`credentials.json` 含明文凭据、`archive-*/` 含抓取到的用户数据，全部不允许入库。

## 第 1 步：判断是否需要登录

任选其一快速探测：

- `curl -s <URL> | grep -i "login\|登录"` —— 页面源码直出登录表单说明该 URL 是登录页
- 匿名快速抓取一次（不带 storage-state），回放看渲染结果

判定规则：

| 探测结果 | 走向 |
|---|---|
| 公开页直接渲染完整内容 | 跳到第 3 步（命令去掉 `--storage-state`） |
| 渲染的是登录页 / 数据为空 | 走第 2 步登录捕获 |

登录站需要用户提供凭据，写入 `workspace/credentials.json`（gitignored）：

```json
{ "email": "user@example.com", "password": "..." }
```

凭据来源：用户当场提供或已存入 agent memory。**禁止**把凭据写进脚本源码、文档或 git 跟踪的文件。

## 第 2 步：登录捕获（生成 auth.json）

```bash
node ../.claude/skills/uiforge-site-clone/scripts/login-capture.mjs --url <登录后入口页URL>
```

脚本行为：打开页面 → 填邮箱密码框 → 点登录按钮（默认匹配 `登录|Sign in|Log in`，可用 `--button-text` 覆盖）→ 等待加载 → 校验密码框是否消失 → 保存 `auth.json`。

- 密码框仍存在（退出码 2）→ 凭据错误或表单结构不同：核对凭据，必要时人工打开页面确认表单选择器
- 成功标志：输出的「密码框仍存在」为 0，且 URL 停在入口页

## 第 3 步：带登录态抓取 Archive

```bash
node ../thirdparties/UIForge/tools/uiforge-archive.mjs <URL> --out-dir ./archive-<站点名> --explore --storage-state ./auth.json
```

- `--explore` 必须加：抓取过程中自动滚动、点击页内控件，把这些交互触发的 API 数据也录进归档——探索越多，离线回放可用的交互越多
- 结束后关注输出的响应数（scripts/css/data-API/fonts/images 分类计数），登录后抓取的 data/API 载荷应明显多于匿名抓取；明显偏少说明 token 失效，重跑第 2 步

## 第 4 步：起回放服务器

```bash
cd archive-<站点名> && node serve.mjs
```

输出 `UIForge replay → http://localhost:8787`。镜像在 `files/` 下按真实 URL 路径存放（真实文件名与扩展名），服务器每次请求读最新文件——改镜像内文本，刷新即生效。

端口占用或目录删不掉（`Device or resource busy`）→ 上次的 serve.mjs 还在跑：`netstat -ano | grep 8787` 找 PID，`taskkill //F //PID <pid>` 单独处理，**禁止杀全部 node 进程**。

## 第 5 步：回放验证（渲染）

真实浏览器打开回放 URL，检查三项：

1. `document.getElementById('root')`（或等价挂载点）内容非空、标题正确
2. 渲染的是目标页面而非登录页
3. 控制台无阻塞性 JS 报错

## 第 6 步：白屏修复（仅登录站需要）

**症状**：抓取正常（响应数多）但回放全白，network 面板出现 `GET http://localhost:8787/login.html` 失败（ERR）。

**根因**：站点 JS 启动时校验 localStorage 里的 token，失败则跳登录页。`--storage-state` 只在抓取时的 Playwright 上下文生效；回放用的是用户自己的浏览器，其 origin（localhost:8787）没有这些 localStorage 键 → 校验失败 → 跳 `login.html` → 镜像里没有该文件 → 404 → 白屏。详见 `dev-docs/experience/uiforge-replay-login-localstorage-whitepage.md`。

**修复**：把 `auth.json` 里 localStorage 键值做成种子脚本注入镜像入口 HTML：

```bash
cd ..   # 回到 workspace/
node ../.claude/skills/uiforge-site-clone/scripts/inject-auth-seed.mjs \
  --auth ./auth.json --files ./archive-<站点名>/files --entry <入口页相对路径>
```

`--entry` 是入口 HTML 在 `files/<域名>/` 下的相对路径（如 `console/console.html`）。脚本幂等：已注入自动跳过。刷新回放页面即可看到登录后界面。

## 第 7 步：交互验证与收尾

- 在回放页面至少真实点击一个交互（选项卡、编辑按钮、下拉等），确认弹出/切换的是预期内容——离线回放跑的是原站真实 JS + 缓存数据，交互应与原站一致
- 汇报：归档路径、响应数、验证结果（渲染 + 交互）、局限（未探索到的交互其 API 数据可能缺失、token 有过期时间）
- 可选下一步：可编辑代码版用 Restore 工具链（`uiforge-detect → uiforge-sourcemap → uiforge-restore`），像素冻结用 `uiforge-freeze`
- **敏感数据**：归档目录含登录态种子和用户数据，确认未被 git 跟踪后再提交任何文件
