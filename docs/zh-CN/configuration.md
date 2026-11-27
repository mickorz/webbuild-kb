# 配置参考

## 配置项

本仓库无可执行配置文件，配置集中在抓取沙盒 `workspace/`：

| 名称 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `workspace/credentials.json` | JSON 文件 | 无 | 登录凭据（`{ "email": "...", "password": "..." }`），供 `login.mjs` 读取；**已 gitignore，不入库** |
| `workspace/auth.json` | JSON 文件 | 无 | Playwright storageState（cookies + localStorage），抓取登录态载体；**已 gitignore** |
| `--out-dir` | CLI 参数 | `./archive` | uiforge-archive 输出目录，本仓库约定 `./archive-<站点名>`；**archive-*/ 已 gitignore** |
| 回放端口 | serve.mjs 固定 | 8787 | 离线回放服务器端口 |

## 生效与验证

凭据改动后重新执行 `node login.mjs` 生成新的 `auth.json`，再带 `--storage-state ./auth.json` 重新抓取；回放服务器每次请求都读最新文件，镜像内文本改动刷新即生效。

## 升级

子模块升级到上游最新并固定新 commit：

```bash
git submodule update --remote
git add thirdparties .gitmodules
# 同步更新 thirdparties/REFERENCES.md 中的固定 commit 列
```

抓取沙盒依赖升级：`cd workspace && npm update playwright`。

## 卸载

- 移除某个子模块：`git submodule deinit -f thirdparties/<名> && git rm -f thirdparties/<名>`，并删除 REFERENCES.md 对应行
- 清理抓取产物：删除 `workspace/archive-*/`、`workspace/auth.json`、`workspace/serve.log`
