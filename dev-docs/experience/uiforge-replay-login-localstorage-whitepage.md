# uiforge-archive 回放登录站白屏（login.html 跳转失败）

日期：2026-11-27

## 问题现象

用 `uiforge-archive.mjs --storage-state auth.json` 抓取 bishuxiezuo.cn 登录后的控制台页（277 响应，208 个 API 载荷，抓取正常），但离线回放 `serve.mjs` 后页面**全白**，React root 为空。

## 排查过程

1. 浏览器网络面板发现 `GET http://localhost:8787/login.html` 请求失败（ERR）——镜像里根本没有 login.html。
2. 检查 `auth.json`：cookies 只有一个统计用 cookie（lf_web_visitor），**真正的登录态在 localStorage**（`novelbuilt.tokens`、`lf_tokens` 等键，origin 为 https://bishuxiezuo.cn）。

## 根因

站点 JS 启动时校验 localStorage 里的 token 决定是否渲染控制台、否则跳转登录页。`--storage-state` 只在**抓取时的 Playwright 上下文**里生效；回放用的是**用户自己的浏览器**，其 origin 是 localhost:8787，自然没有这些 localStorage 键 → 校验失败 → 跳 login.html → 404 → 白屏。

## 解决方案

把 `auth.json` 中 `origins[].localStorage` 的键值对做成一段内联种子脚本，注入镜像内入口 HTML（`<body>` 标签后第一个 `<script>`），循环 `localStorage.setItem(k, v)`。回放服务器每次请求都读最新文件，所以改镜像文件立即生效，归档保持**自包含**（任何人克隆即得登录态回放）。

注入用的一行命令见 `docs/how-to-guides.md` 「抓取需要登录的站点」第 5 步。

## 预防/注意事项

- 判断登录态载体先看 `auth.json` 的 `origins[].localStorage`，别只看 cookies。
- token 有过期时间的站点，auth.json 失效后需重跑 `login.mjs` 并重新抓取。
- 种子脚本含敏感 token，注意 archive 目录不要提交入库（.gitignore 已排除 `workspace/archive-*/`）。
