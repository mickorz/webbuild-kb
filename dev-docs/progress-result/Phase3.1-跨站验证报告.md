# Phase 3.1 执行报告：跨站验证（saucedemo.com）

阶段：Phase 3.1
完成时间：2026-11-28
目标：验证 UIForge 工具箱在**不同技术栈站点**上是否可复用，且**不修改核心回放引擎**

## 站点选择

| 项目 | 笔枢（验证站 1） | saucedemo（验证站 2） |
|------|------------------|------------------------|
| 技术栈 | 自研 SPA + 大量 REST API + SSE | React（CRA）SPA，无业务 API（数据打包在 bundle） |
| 登录方式 | localStorage token + 自定义种子 | **cookie** `session-username` |
| 数据来源 | 服务端 API（69 端点） | 静态 JS bundle |
| 异步任务 | 铸造引擎 + SSE 流 | 无 |
| 测试凭据 | 用户提供 | 官方公开测试账号（standard_user/secret_sauce） |

选择理由：技术栈与登录态载体都不同（localStorage vs cookie、API 驱动 vs bundle 驱动），能检验工具箱的通用性；且使用官方公开测试账号，不产生账号注册等外部副作用。

> 注：`demo.realworld.io`（最贴合「REST API + 分页」的候选）实测不可达（HTTP 000），故改用 saucedemo。并行会话另选了 `gameuidatabase.com`（jQuery 静态站）作为第三个样本。

## 执行结果

| 步骤 | 结果 | 是否需改核心引擎 |
|------|------|------------------|
| 登录并保存 storageState | ✅ `login.mjs`（20 行站点脚本） | 否 |
| UIForge 采集 | ✅ 14 条响应，`--explore` 正常 | 否 |
| 审计（api-coverage-audit） | ✅ 正常运行（0 API 端点，符合该站特征） | 否 |
| 离线回放 | ⚠️→✅ 初次提示需登录；注入 cookie 种子后正常 | **否**（新增站点适配脚本） |
| 回归（runner） | ✅ 2/2 通过 | 否（runner 原样复制，仅换 scenarios.json） |

**回放验证事实**：注入 `session-username=standard_user` cookie 后，离线副本渲染 6 个商品，商品名与线上一致（Sauce Labs Backpack / Bike Light / Bolt T-Shirt）。

## 新沉淀（通用能力，非站点专用 hack）

`inject-session-seed.mjs`（skill scripts）：支持三种会话载体种子注入，幂等（重复执行先移除旧种子）

```bash
node inject-session-seed.mjs --files <archive>/files --entry <入口页> \
  --cookie "session-username=standard_user" \
  --ls "k=v" --ss "k=v"
```

填补了原 `inject-auth-seed.mjs`（只处理 localStorage）的空白——cookie / sessionStorage 站点此前无解。

## 站点适配清单（新增站点时需要什么）

| 项 | 是否通用 | 说明 |
|----|----------|------|
| 登录脚本 | 站点专用（~20 行） | 选择器不同，套用 `login-capture` 或自写 |
| 会话种子 | 通用脚本 + 参数 | cookie / localStorage / sessionStorage |
| Replay Policy | 通用，按需配置 | 快照类 GET 用 `latest`，事件类用 `cursor` |
| 回放引擎 | **零修改** | v2.7 直接可用 |
| 回归 runner | 零修改（复制） | 只写 `scenarios.json` |

## 验收对照（用户设定指标）

| 指标 | 结果 |
|------|------|
| API 发现 | N/A（该站无业务 API；bishuxiezuo 上已验证 69 端点） |
| 请求匹配不误命中其他变体 | N/A（无 API）；引擎层由 bishuxiezuo 多变体场景覆盖 |
| 页面回放关键交互可用 | ✅ 列表 + 详情 |
| 数据一致性 | ✅ 商品名一致 |
| 回归稳定性 | ✅ 2/2，重复执行一致 |
| **新站适配不改核心引擎** | ✅ **达成**（仅新增种子注入脚本与站点配置） |

## 已知差异与遗留

1. saucedemo 的 `Permissions policy violation: unload` 是站点特性噪声，场景里以 `maxConsoleErrors: 1` 显式放行（不是忽略所有错误）
2. 未做「编辑后持久化」场景（该站购物车状态在 localStorage，无服务端持久化可验证）；下一步可在有写 API 的站点补
3. 排序/筛选交互需要 runner 增加 `select` 步骤能力（当前无），属通用增强，非本批范围

## 结论

核心回放引擎（指纹匹配 / 多变体 / FIFO-latest / 歧义拒绝 / SSE 事件级 / 游标语义）在**完全不同的技术栈站点**上无需修改即可工作；跨站差异集中在「登录态载体」与「场景定义」两处，且后者是配置而非代码。这支持了把 webbuild-kb 视为通用采集-回放工具箱的判断。
