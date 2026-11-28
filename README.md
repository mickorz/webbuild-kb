# webbuild-kb

网站构建知识库。以 git submodule 形式聚合三个开源工具，覆盖从「抓取还原网站」到「让 AI 操作浏览器」的完整链路：

1. 用 browser-bridge 让 AI 代理驱动真实浏览器；
2. 用 PrprprWarp / UIForge 把目标网站捕获为可离线回放、可编辑的结构化副本；
3. 基于捕获结果分析、复刻和重建网站。

## 第三方仓库（thirdparties）

| 子模块 | 源仓库 | 简介 |
|---|---|---|
| [PrprprWarp](thirdparties/PrprprWarp) | [StarsailsClover/PrprprWarp](https://github.com/StarsailsClover/PrprprWarp) | Chrome/Edge MV3 扩展，把网页捕获为结构化离线镜像（Snapshot 静态快照 + Live 本地服务器回放），包含 DOM 序列化、网络响应捕获、React 分析与路由图。 |
| [UIForge](thirdparties/UIForge) | [TaewoooPark/UIForge](https://github.com/TaewoooPark/UIForge) | 网站克隆工具，三种产物：Archive（离线回放真实 JS 与缓存数据，交互可用）、Freeze（像素级一致的冻结页）、Restore（像素一致、可编辑的 React + Tailwind 还原）。 |
| [browser-bridge](thirdparties/browser-bridge) | [vitalysim/browser-bridge](https://github.com/vitalysim/browser-bridge) | MCP 服务器 + MV3 扩展，让 Claude Code / Codex CLI 等 AI 代理直接控制用户日常登录的 Chrome，提供 78 个工具：浏览操作、DevTools 级网络捕获、安全测试、交互录制与 MP4 导出。 |

## 使用

克隆本仓库并一并拉取所有子模块：

```bash
git clone --recursive https://github.com/mickorz/webbuild-kb.git
```

已克隆但没有拉子模块时：

```bash
git submodule update --init --recursive
```

更新子模块到各自远程最新：

```bash
git submodule update --remote
```

## 本地回放访问（portless）

克隆站点的离线回放统一通过 [portless](https://github.com/vercel-labs/portless) 访问：每个站点获得固定的 `https://<站名>.localhost` 域名，端口由 portless 自动分配，多个回放服务器可同时运行而互不冲突（不再依赖固定端口号）。

首次使用（一次性，需要 Node.js 24+）：

```bash
npm install -g portless
```

启动某个站点的回放：

```bash
# 方式一：仓库根目录的 open.bat，默认 bishuxiezuo，可传站点名
open.bat bishuxiezuo

# 方式二：手动在归档目录启动
cd workspace/<站点>/<归档目录>
portless <站点名> node serve.mjs
# 浏览器打开 https://<站点名>.localhost/
```

约定：`workspace/<站点>/` 下的站点以其目录名作为 portless 路由名（如 `bishuxiezuo` → `https://bishuxiezuo.localhost`）。首次以 HTTPS 启动时 portless 会创建本地 CA 并请求管理员授权写入系统信任存储，之后浏览器即可直接信任 `*.localhost` 证书。

诊断：`portless list` 查看活动路由，`portless doctor` 排查访问问题。

## 说明

- 三个子模块均为第三方开源项目的只读镜像，本仓库不修改其源码；各自的许可协议以其仓库为准。
- 子模块锁定在特定 commit，更新需显式执行上述命令，保证知识库状态可复现。
