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

## 说明

- 三个子模块均为第三方开源项目的只读镜像，本仓库不修改其源码；各自的许可协议以其仓库为准。
- 子模块锁定在特定 commit，更新需显式执行上述命令，保证知识库状态可复现。
