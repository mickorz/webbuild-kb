# 第三方参考项目清单（REFERENCES.md）

> 维护规则：所有第三方项目只读，不修改源码；复用代码前必须核对 License；本文件随仓库入库。
> 引入方式分两类：本地只读目录（默认也随仓库入库，重新下载/克隆覆盖更新；需排除的单独在 .gitignore 追加）与 Git Submodule（固定 commit，gitlink 入库）。
> 引入日期：逐条在表格登记时记录。

| ID | 项目 | 仓库 | 本地路径 | 固定 commit | License | 复用策略 | 研究目的 |
|---|---|---|---|---|---|---|---|
| REF-001 | PrprprWarp | https://github.com/StarsailsClover/PrprprWarp.git | thirdparties/PrprprWarp | 1ba8f18f5e31641d586e75b53094c02d4782e3c7 (v26.0-Alpha.1) | MIT | 只读参考，研究方法论 | 网站离线镜像捕获方案：MV3 扩展、CDP 响应体捕获、DOM 序列化、Snapshot/Live 双视图回放 |
| REF-002 | UIForge | https://github.com/TaewoooPark/UIForge.git | thirdparties/UIForge | 00eca2053ce8cbabdfddd7704d7067df9d0fcacd (v3.64.0) | MIT | 只读参考，研究方法论（本仓库当前主力抓取工具） | 网站复刻三产物管线：Archive（行为回放）/ Freeze（像素冻结）/ Restore（React 还原），零依赖 Playwright 工具链 |
| REF-003 | browser-bridge | https://github.com/vitalysim/browser-bridge | thirdparties/browser-bridge | 35338b48c08231a154d651b18e8b74063322c010 (v0.19.2) | MIT | 只读参考，研究方法论 | AI 代理驱动真实登录浏览器：MCP 服务器 + MV3 扩展、网络捕获、会话录制 |
| REF-004 | portless | https://github.com/vercel-labs/portless.git | thirdparties/portless | 83ed9d00cfdf352ea5056d31e9da774868c857c7 (v0.18.1-23) | Apache-2.0 | 只读参考，研究方法论 | 本地开发反代：给 dev server 分配稳定命名 https://*.localhost URL，替代端口号记忆，代理与多站点路由实现可参考 |

## Submodule 引入与登记流程

1. 引入：`git submodule add <仓库地址> thirdparties/<项目名>`，克隆后固定到目标 commit。
2. 忽略规则：`.gitignore` 默认不忽略 `thirdparties/`，无需白名单；如某个本地只读目录不入库，单独追加该目录的 ignore 条目。
3. 登记：在本文件表格新增一行，固定 commit 用 `git -C thirdparties/<项目名> rev-parse HEAD` 获取；License 读取仓库内 LICENSE 文件，无 LICENSE 的仓库填「未发现 LICENSE 文件」并将复用策略标为「只读研究，禁止复制任何代码」。
4. 一并提交：`.gitmodules`、submodule gitlink、本文件。
5. 本地只读目录：无 gitlink，其余流程相同（登记、提交清单）；不入库的单独追加 ignore 条目。

## 说明

1. Submodule 只作为源码研究与方法论参考，不代表全部集成进最终产品；集成决策记录在 `dev-docs/research/`。
2. 更新方式：本地目录用重新下载/克隆覆盖；Submodule 用 `git submodule update --remote <path>` 固定新 commit 并更新本表。
3. 复用第三方代码前核对其 License 与版权声明；复用思想则把提炼后的内容写进本仓库自己的文档并标注来源。
