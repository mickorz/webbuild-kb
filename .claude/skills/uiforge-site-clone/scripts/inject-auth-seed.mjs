#!/usr/bin/env node
// 把 auth.json 里的 localStorage 登录态注入镜像入口 HTML，使离线回放保持登录
//
// 背景：站点 JS 启动时校验 localStorage token，回放 origin（localhost:8787）没有这些键
// 时会跳 login.html 导致白屏。注入的种子脚本在页面其余脚本之前执行 localStorage.setItem。
// 详见 dev-docs/experience/uiforge-replay-login-localstorage-whitepage.md
//
// 用法（纯 node，无依赖）:
//   node inject-auth-seed.mjs --auth auth.json --files <archive>/files --entry console/console.html [--host <域名>]
//
// 退出码: 0 成功或已注入（幂等跳过）/ 1 参数或路径问题
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const val = n => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null }
const authPath = val('--auth') || 'auth.json'
const filesDir = val('--files')
const entry = val('--entry')
const hostArg = val('--host')

if (!filesDir || !entry) {
  console.error('用法: node inject-auth-seed.mjs --auth auth.json --files <archive>/files --entry <入口页相对路径> [--host <域名>]')
  process.exit(1)
}

const state = JSON.parse(readFileSync(authPath, 'utf8'))
const origin = state.origins.find(o => !hostArg || o.origin.includes(hostArg))
if (!origin || !origin.localStorage || origin.localStorage.length === 0) {
  console.error('auth.json 中没有可注入的 localStorage 登录态（origins 为空或无键值）')
  process.exit(1)
}
const host = hostArg || new URL(origin.origin).hostname

const entryPath = join(filesDir, host, entry)
if (!existsSync(entryPath)) {
  console.error(`入口 HTML 不存在: ${entryPath}（检查 --files 与 --entry 拼接路径）`)
  process.exit(1)
}

let html = readFileSync(entryPath, 'utf8')
if (html.includes('auth-seed:')) {
  console.log('入口 HTML 已包含登录态种子，跳过（幂等）:', entryPath)
  process.exit(0)
}
const bodyMatch = html.match(/<body[^>]*>/)
if (!bodyMatch) {
  console.error('入口 HTML 中未找到 <body> 标签，无法注入')
  process.exit(1)
}

const pairs = {}
for (const item of origin.localStorage) pairs[item.name] = item.value
// 种子放在 body 开头，先于应用脚本执行，保证后续登录校验能读到 token
const seed = `<script>/* auth-seed: inject captured login state so offline replay stays logged in */ (function(){ try { var P=${JSON.stringify(pairs)}; for (var k in P) localStorage.setItem(k, P[k]); } catch(e) { console.warn("auth-seed failed", e); } })();</script>`
html = html.replace(bodyMatch[0], bodyMatch[0] + seed)
writeFileSync(entryPath, html)
console.log(`注入完成: ${entryPath}（${Object.keys(pairs).length} 个 localStorage 键，来自 ${origin.origin}）`)
