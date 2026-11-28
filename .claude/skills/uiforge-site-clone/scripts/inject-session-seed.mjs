#!/usr/bin/env node
// 会话种子注入：把登录态写入归档的入口 HTML，使离线回放自动带登录态
// 支持三种载体（跨站适配用，不改回放引擎）:
//   cookie          → document.cookie
//   localStorage    → localStorage
//   sessionStorage  → sessionStorage
//
// 用法:
//   node inject-session-seed.mjs --files <归档>/files --entry <入口页相对路径> \
//     --cookie "session-username=standard_user" \
//     --ls "lf_selected_book=a9379563-..." \
//     --ss "某键=某值"
// 已注入过的文件会先移除旧种子再写入（可重复执行，幂等）。
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const vals = n => argv.reduce((a, x, i) => (x === n && argv[i + 1] ? [...a, argv[i + 1]] : a), [])
const val = n => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null }
const files = val('--files')
const entry = val('--entry')
const cookies = vals('--cookie')
const lss = vals('--ls')
const sss = vals('--ss')
if (!files || !entry) { console.error('需要 --files 与 --entry'); process.exit(1) }
if (!cookies.length && !lss.length && !sss.length) { console.error('至少给一个 --cookie / --ls / --ss'); process.exit(1) }

const target = join(files, entry)
if (!existsSync(target)) { console.error('入口文件不存在:', target); process.exit(1) }

const MARK = '<!--session-seed-->'
const parse = kv => { const i = kv.indexOf('='); return [kv.slice(0, i), kv.slice(i + 1)] }
const jsStr = s => JSON.stringify(String(s))

const lines = []
for (const c of cookies) {
  const [k, v] = parse(c)
  lines.push(`try{document.cookie=${jsStr(k + '=' + v + '; path=/')}}catch(e){}`)
}
if (lss.length) {
  const pairs = lss.map(x => { const [k, v] = parse(x); return `${jsStr(k)}:${jsStr(v)}` }).join(',')
  lines.push(`try{var _l={${pairs}};for(var k in _l)localStorage.setItem(k,_l[k])}catch(e){}`)
}
if (sss.length) {
  const pairs = sss.map(x => { const [k, v] = parse(x); return `${jsStr(k)}:${jsStr(v)}` }).join(',')
  lines.push(`try{var _s={${pairs}};for(var k in _s)sessionStorage.setItem(k,_s[k])}catch(e){}`)
}
const seed = `${MARK}<script>(function(){${lines.join('')}})();</script>`

let html = readFileSync(target, 'utf8')
// 幂等：先移除之前注入的种子块
html = html.replace(/<!--session-seed--><script>[\s\S]*?<\/script>/g, '')
if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + seed)
else html = seed + html
writeFileSync(target, html)
console.log('已注入种子 →', entry, '|', [cookies.length && cookies.length + ' cookie', lss.length && lss.length + ' localStorage', sss.length && sss.length + ' sessionStorage'].filter(Boolean).join(' + '))
