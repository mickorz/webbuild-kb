# uiforge-archive 回放服务器不服务新增文件（204）

日期：2026-11-27

## 问题现象

往镜像 `files/` 目录里新增 CSS/JS 文件（如 `uiforge-overrides.css`），HTML 里正常引用后，页面 `fetch` 该文件返回 **HTTP 204 No Content**（空 body），规则完全不生效。此前用同样方式 fetch 新增的种子 JS 文件也是空内容，导致 `eval("")` 静默无效（返回 `undefined`），当时误以为种子已注入。

## 排查过程

1. link 标签存在、`link.sheet` 存在但 `cssRules.length === 0`
2. 直接 `fetch` 该文件：状态 204，body 为空
3. 对比：清单内已有文件（console.css）正常返回 200 + 内容

## 根因

`serve.mjs` 回放服务器只服务**抓取时记录在清单内的文件**（163/277 个响应的索引），不提供任意静态文件；新增路径不在清单 → 204。且 204 + 空 body 的 fetch 不会抛错，容易造成「注入成功」的假象。

## 解决方案

定制镜像行为时，**修改清单内已有的文件**，而不是新增文件：

- CSS 覆盖：追加到 `console.css` 末尾（serve 每次请求读最新文件，立即生效）
- 防浏览器缓存：同时把 `console.html` 里对应 `<link>` 的版本参数改一下（如 `console.css?v=20261126_df44` → `..._df44o2`），HTML 本身在清单内、每次都是新读取的
- 内联种子脚本：直接写在 `console.html` 的 `<body>` 开头（同 auth-seed 做法）

## 预防/注意事项

- 凡是「改了镜像但页面没变化」，先在页面里 `fetch` 该文件确认返回 200 与内容，排除 204 假注入
- 新增文件方案行不通；别浪费时间去查 MIME 或路径拼写
- 重新抓取（重跑 uiforge-archive）会整体覆盖镜像，定制改动（CSS 追加、auth-seed）需要重新应用
