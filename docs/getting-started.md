# Getting Started

webbuild-kb 是网站构建知识库：以 git submodule 聚合三个开源工具（PrprprWarp、UIForge、browser-bridge），覆盖「AI 驱动浏览器 → 捕获网站 → 离线回放/复刻」的完整链路。

## Prerequisites

- Git（含 submodule 支持）
- Node.js >= 18（抓取沙盒与 UIForge 工具链使用）
- Playwright Chromium（首次使用抓取沙盒时安装）

## Install

```bash
git clone --recursive https://github.com/mickorz/webbuild-kb.git
cd webbuild-kb
```

已克隆但没拉子模块时：

```bash
git submodule update --init --recursive
```

安装抓取沙盒共享依赖（一次性，装在 workspace/common/）：

```bash
cd workspace/common
npm install
npx playwright install chromium
```

## Verify

```bash
git submodule status   # 三个子模块均无前缀 + 号即固定 commit 已还原
node --version         # >= 18
```

## First Run

用 UIForge 把目标站点捕获为可离线回放的 Archive（以 bishuxiezuo.cn 为例）：

```bash
cd workspace/common
node ../thirdparties/UIForge/tools/uiforge-archive.mjs https://bishuxiezuo.cn/console/console.html --out-dir ./archive-bishu --explore
cd archive-bishu && node serve.mjs   # 打印 http://localhost:8787
```

浏览器打开回放地址即可查看离线副本。需要登录后页面的完整流程见 how-to-guides.md。

## Next Steps

- 配置项与目录约定见 configuration.md
- 登录态抓取、新增第三方子模块等任务见 how-to-guides.md
- 常见问题见 troubleshooting.md
