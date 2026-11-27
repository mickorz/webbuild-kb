# 贡献者指南

## 环境与常用命令

| 命令 | 用途 |
|---|---|
| `git submodule update --init --recursive` | 还原子模块到固定 commit |
| `git submodule update --remote` | 升级子模块到上游最新 |
|  `cd workspace/common && npm install && npx playwright install chromium` | 装抓取沙盒依赖 |
| `cd workspace/<站点> && node ../../.claude/skills/uiforge-site-clone/scripts/login-capture.mjs --url <入口页URL>` | 登录目标站并保存 storageState |
| `NODE_PATH=<common绝对路径> node ../../thirdparties/UIForge/tools/uiforge-archive.mjs <url> --out-dir ./archive-x --explore`（在 workspace/<站点>/ 内） | 抓取 Archive |
| `node workspace/<站点>/archive-x/serve.mjs` | 起离线回放（:8787） |

## 架构一览

```text
webbuild-kb/
├── thirdparties/     三个只读 submodule（PrprprWarp / UIForge / browser-bridge），清单见 REFERENCES.md
├── workspace/        抓取沙盒：common/ 共享 Playwright 依赖；<站点>/ 每站凭据与 archive 产物（均不入库）
├── docs/             读者向文档（本目录）
├── dev-docs/         开发过程文档（规范见根 CLAUDE.md）
└── dev-examples/     开发期沙盒
```

子模块只读，不修改其源码；工具链调用方式见各子模块自身 README。

## 测试

仓库以知识库为主，无单元测试；抓取/回放结果按 testing.md 的验收清单人工核验。

## 本地开发循环

改文档 → 提交推送；改抓取流程 → 在 `workspace/` 或 `dev-examples/` 里试验，验证后毕业进 `docs/`。

## 发布

无发布流程；`main` 分支即知识库最新状态，子模块固定 commit 保证可复现。
