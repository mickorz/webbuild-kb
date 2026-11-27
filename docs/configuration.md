# Configuration Reference

## Configuration Fields

本仓库无可执行配置文件，配置集中在抓取沙盒 `workspace/`，布局为 `common/`（共享依赖）+ `<站点>/`（每站独立目录，凭据与会话按站隔离）：

| 名称 | 类型 | 默认 | 说明 |
|---|---|---|---|
|  `workspace/<站点>/credentials.json` | JSON 文件 | 无 | 登录凭据（`{ "email": "...", "password": "..." }`），供 uiforge-site-clone 技能的 login-capture.mjs 读取；**已 gitignore，不入库** |
|  `workspace/<站点>/auth.json` | JSON 文件 | 无 | Playwright storageState（cookies + localStorage），抓取登录态载体；**已 gitignore** |
| `--out-dir` | CLI 参数 | `./archive` | uiforge-archive 输出目录，本仓库约定 `./archive-<站点名>`；**archive-*/ 已 gitignore** |
| 回放端口 | serve.mjs 固定 | 8787 | 离线回放服务器端口 |

## Taking Effect & Verification

凭据改动后重新执行 `node ../.claude/skills/uiforge-site-clone/scripts/login-capture.mjs --url <入口页URL>` 生成新的 `auth.json`，再带 `--storage-state ./auth.json` 重新抓取；回放服务器每次请求都读最新文件，镜像内文本改动刷新即生效。

## Upgrade

子模块升级到上游最新并固定新 commit：

```bash
git submodule update --remote
git add thirdparties .gitmodules
# 同步更新 thirdparties/REFERENCES.md 中的固定 commit 列
```

抓取沙盒依赖升级：`cd workspace/common && npm update playwright`。

## Uninstall

- 移除某个子模块：`git submodule deinit -f thirdparties/<名> && git rm -f thirdparties/<名>`，并删除 REFERENCES.md 对应行
- 清理抓取产物：删除对应站点目录 `workspace/<站点>/`（含 archive、auth.json、serve.log）
