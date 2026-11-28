#!/usr/bin/env node
// serve-upgrade-version: 2.2
// UIForge replay server v2 — 在 v1 基础上升级（见 dev-docs/design/2026-11-28-api-capture-audit-mvp.md）:
//   1 请求体感知匹配: 带 body 的请求先按 key 里的请求体指纹（#sha256前12位）精确匹配变体，再走 URL 级回退
//   2 未命中返回 599 + 诊断 JSON（环境变量 REPLAY_MISS=204 可回退旧行为），不再静默 204
//   3 未命中请求追加写入归档目录 unmatched-requests.jsonl，作为补采任务清单
// 其余行为与 v1 一致：精确 URL → 归一化 URL → pathname → 根路径 HTML 回退；录制的 5xx 回放为 200。
// 由 upgrade-replay-serve.mjs 写入归档（原文件备份为 serve.mjs.orig）。
import http from 'node:http'
import { readFileSync, appendFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const idx = JSON.parse(readFileSync(path.join(HERE, 'index.json'), 'utf8'))
const norm = u => { try { const x = new URL(u); for (const p of ['_rsc','__nextDataReq','_','cb','ts','timestamp']) x.searchParams.delete(p); return x.origin + x.pathname + (x.search || '') } catch { return u } }
const byKey = new Map(), byNorm = new Map(), byPath = new Map(), byBody = new Map()
for (const e of idx.entries) {
  byKey.set(e.key, e); byNorm.set(e.method + ' ' + norm(e.url), e)
  try { byPath.set(e.method + ' ' + new URL(e.url).pathname, e) } catch {}
  const hi = e.key.indexOf('#')
  if (hi > 0) byBody.set(e.method + ' ' + norm(e.url) + e.key.slice(hi), e)   // 请求体指纹变体
}
const PORT = +(process.env.PORT || 8787)
const HOST = process.env.HOST || '127.0.0.1'   // local replay; set HOST=0.0.0.0 to expose it
const MISS_STATUS = +(process.env.REPLAY_MISS || 599)   // 未命中状态码；REPLAY_MISS=204 回退 v1 行为
const UNMATCHED = path.join(HERE, 'unmatched-requests.jsonl')
const logUnmatched = o => { try { appendFileSync(UNMATCHED, JSON.stringify({ ts: new Date().toISOString(), ...o }) + '\n') } catch {} }
const inject = `<script>(function(){try{var _d=Date;Date=class extends _d{constructor(){super(1751328000000)}static now(){return 1751328000000}};}catch(e){}
navigator.sendBeacon=function(){return true};try{window.WebSocket=function(){return{send:function(){},close:function(){},addEventListener:function(){}}}}catch(e){}})();</script>`
const readBody = req => new Promise(resolve => {
  if (!/^(POST|PUT|PATCH)$/.test(req.method)) return resolve(null)
  const chunks = []; let n = 0
  req.on('data', c => { n += c.length; if (n <= 10 * 1024 * 1024) chunks.push(c) })
  req.on('end', () => resolve(Buffer.concat(chunks)))
  req.on('error', () => resolve(null))
})
http.createServer(async (req, res) => {
  const full = idx.origin + req.url
  const isRoot = req.url === '/' || req.url === '' || req.url.startsWith('/?')
  const raw = await readBody(req)
  const bh = raw && raw.length ? '#' + createHash('sha256').update(raw).digest('hex').slice(0, 12) : ''
  let e, bodyMissed = false
  if (bh) {
    // 带请求体：先按指纹找变体（同 URL 不同 body 是不同页面状态）；
    // 指纹未中再按 URL 级宽松回退，但必须留痕 —— 那是在拿其他变体的数据回（缺陷 A 回放侧表现）
    e = byBody.get(req.method + ' ' + norm(full) + bh)
    if (!e) { bodyMissed = true; e = byKey.get(req.method + ' ' + full) || byNorm.get(req.method + ' ' + norm(full)) || byPath.get(req.method + ' ' + (req.url.split('?')[0])) }
  } else {
    e = byKey.get(req.method + ' ' + full) || byNorm.get(req.method + ' ' + norm(full)) || byPath.get(req.method + ' ' + (req.url.split('?')[0]))
  }
  if (bodyMissed && e) {
    logUnmatched({ kind: 'body-variant-fallback', method: req.method, url: idx.origin + req.url, bodyHash: bh, bodyLen: raw ? raw.length : 0 })
    console.error('  [replay] body-variant-fallback ' + req.method + ' ' + req.url + ' body=' + bh)
  }
  if (!e && isRoot) e = idx.entries.find(x => norm(x.url) === idx.startNorm && (x.ct || '').includes('html')) || idx.entries.find(x => (x.ct || '').includes('text/html')) || idx.entries[0]
  if (!e) {
    // 未命中：可诊断失败 + 落盘补采清单，而不是静默 204
    logUnmatched({ kind: 'unmatched', method: req.method, url: idx.origin + req.url, bodyHash: bh || null, bodyLen: raw ? raw.length : 0 })
    console.error('  [replay] unmatched ' + req.method + ' ' + req.url + (bh ? ' body=' + bh : '') + ' → ' + MISS_STATUS + ' (logged)')
    res.writeHead(MISS_STATUS, { 'access-control-allow-origin': '*', 'content-type': 'application/json' })
    return res.end(JSON.stringify({ error: 'unmatched-replay-request', method: req.method, url: req.url, bodyHash: bh || null, hint: '该请求未在归档中录制；运行 api-coverage-audit 或补采后重启 serve.mjs' }))
  }
  // The archive is documented as editable, so a file may have been renamed or deleted since
  // capture. Never let that throw out of the handler — an uncaught error here kills the server.
  let body
  try { body = readFileSync(path.join(HERE, 'files', e.file)) }
  catch {
    console.error('  [replay] missing file for ' + e.url + ' → files/' + e.file)
    res.writeHead(404, { 'access-control-allow-origin': '*', 'cache-control': 'no-store' }); return res.end()
  }
  const h = Object.assign({}, e.headers, { 'access-control-allow-origin': '*', 'cache-control': 'no-store' })
  for (const k of Object.keys(h)) h[k] = String(h[k]).replace(/[\r\n]+\s*/g, ', ')
  if ((e.ct || '').includes('text/html')) { let s = body.toString('utf8').replace(/<head[^>]*>/i, m => m + inject); body = Buffer.from(s) }
  h['content-length'] = body.length
  res.writeHead(e.status && e.status < 500 ? e.status : 200, h); res.end(body)
}).on('error', err => {
  if (err.code === 'EADDRINUSE') console.error('\n  port ' + PORT + ' is busy — retry with:  PORT=' + (PORT + 1) + ' node serve.mjs\n')
  else console.error('\n  replay server error: ' + err.message + '\n')
  process.exit(1)
}).listen(PORT, HOST, () => console.log('\n  UIForge replay v2 → http://localhost:' + PORT + '  (' + idx.count + ' responses, ' + idx.start + ')' + (MISS_STATUS === 599 ? '  [miss→599+unmatched.jsonl]' : '  [miss→' + MISS_STATUS + ']') + '\n'))
