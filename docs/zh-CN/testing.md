# 安装与运行验收清单

## 概述

本仓库的「可运行」指：子模块完整还原、抓取沙盒可用、离线回放渲染正常。按下面清单逐项验收。

## 安装检查

- [ ] `git clone --recursive` 后 `git submodule status` 三个子模块均无 `+` 前缀
- [ ] `thirdparties/REFERENCES.md` 表格行数与子模块数量一致，固定 commit 列非空
- [ ] `cd workspace/common && npm install` 成功，`npx playwright install chromium` 完成

## 冒烟测试

- [ ] `node workspace/bishuxiezuo/archive-bishu/serve.mjs` 启动并打印 `http://localhost:8787`
- [ ] 浏览器打开回放地址，页面渲染为登录后控制台（书架、用户名可见，非登录页/白屏）
- [ ] 页内交互至少验证一项（如作品卡「编辑」弹出表单）
- [ ] 控制台无阻塞性 JS 报错

## 最终清单

- [ ] `workspace/<站点>/` 下的 auth.json、credentials.json、archive-*/ 未被 git 跟踪（`git status` 干净）
- [ ] 子模块目录无本地改动（`git submodule status` 无 `+`、`git diff --submodule` 为空）
- [ ] 文档改动已同步 en / zh-CN 两个版本
