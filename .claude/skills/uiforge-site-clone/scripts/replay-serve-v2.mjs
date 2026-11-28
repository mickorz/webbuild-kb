#!/usr/bin/env node
// serve-upgrade-version: 2.3
// UIForge replay server v2.3 — 完整性加固（Batch 3，见 dev-docs/progress-result/Batch3-执行报告.md）:
//   1 同签名多响应 FIFO: 归档允许同 key 多条目（同一请求在不同业务状态下的不同响应），按请求顺序消费，超出后停在最后一版
//   2 Query 排序归一化: 参数顺序不同视为同一 URL，消除顺序误判
//   3 歧义检测: URL 级宽松回退命中多个不同变体时拒绝猜测（599 + 留痕），唯一候选才允许回退且留痕
//   4 原始状态码保留: 录制的 5xx 按原样回放，不再改写为 200
//   5 截断请求体不指纹: 超过 10MB 的请求体只做 URL 级回退并留痕，不用截断数据的哈希去匹配
// 其余行为同 v1: HTML 注入、CORS、no-store、根路径 HTML 回退；未命中 599（REPLAY_MISS=204 回退旧行为）。
// 由 upgrade-replay-serve.mjs 写入归档（原文件备份为 serve.mjs.orig）；归档内运行，index.json 与本文件同目录。
import http from 'node:http'
import { readFileSync, appendFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const idx = JSON.parse(readFileSync(path.join(HERE, 'index.json'), 'utf8'))
// 归一化: 丢易变参数 + query 参数按名排序（顺序不同视为同一 URL）
const norm = u => { try { const x = new URL(u); for (const p of ['_rsc','__nextDataReq','_','cb','ts','timestamp']) x.searchParams.delete(p); const sp = [...x.searchParams.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0); x.search = ''; for (const [k, v] of sp) x.searchParams.append(k, v); return x.origin + x.pathname + (x.search || '') } catch { return u } }
const byNorm = new Map(), byPath = new Map(), byBody = new Map()
const add = (map, sig, e) => { const a = map.get(sig); if (a) a.push(e); else map.set(sig, [e]) }
for (const e of idx.entries) {
  add(byNorm, e.method + ' ' + norm(e.url), e)
  try { add(byPath, e.method + ' ' + new URL(e.url).pathname, e) } catch {}
  const hi = e.key.indexOf('#')
  if (hi > 0) add(byBody, e.method + ' ' + norm(e.url) + e.key.slice(hi), e)   // 请求体指纹变体
}
const fifo = new Map()   // 签名 → 已消费次数
const pick = (map, sig) => { const a = map.get(sig); if (!a) return null; const n = fifo.get(sig) || 0; fifo.set(sig, n + 1); return a[Math.min(n, a.length - 1)] }
const PORT = +(process.env.PORT || 8787)
const HOST = process.env.HOST || '127.0.0.1'   // local replay; set HOST=0.0.0.0 to expose it
const MISS_STATUS = +(process.env.REPLAY_MISS || 599)   // 未命中状态码；REPLAY_MISS=204 回退 v1 行为
const UNMATCHED = path.join(HERE, 'unmatched-requests.jsonl')
const logUnmatched = o => { try { appendFileSync(UNMATCHED, JSON.stringify({ ts: new Date().toISOString(), ...o }) + '\n') } catch {} }
const inject = `<script>(function(){try{var _d=Date;Date=class extends _d{constructor(){super(1751328000000)}static now(){return 1751328000000}};}catch(e){}
navigator.sendBeacon=function(){return true};try{window.WebSocket=function(){return{send:function(){},close:function(){},addEventListener:function(){}}}}catch(e){}})();</script>`
const readBody = req => new Promise(resolve => {
  if (!/^(POST|PUT|PATCH)$/.test(req.method)) return resolve(null)
  const chunks = []; let n = 0, truncated = false
  req.on('data', c => { n += c.length; if (n <= 10 * 1024 * 1024) chunks.push(c); else truncated = true })
  req.on('end', () => resolve({ buf: Buffer.concat(chunks), truncated }))
  req.on('error', () => resolve(null))
})
const rejectAmbiguous = (res, kind, base) => {
  logUnmatched({ kind, ...base })
  console.error('  [replay] ' + kind + ' ' + base.method + ' ' + base.url + ' → ' + MISS_STATUS)
  res.writeHead(MISS_STATUS, { 'access-control-allow-origin': '*', 'content-type': 'application/json' })
  res.end(JSON.stringify({ error: 'ambiguous-replay-variant', kind, method: base.method, url: base.url, hint: '同 URL 录到多个请求变体且本请求无法唯一定位，拒绝猜测返回错数据；请补采该请求变体后重启 serve.mjs' }))
}
http.createServer(async (req, res) => {
  const full = idx.origin + req.url
  const isRoot = req.url === '/' || req.url === '' || req.url.startsWith('/?')
  const rb = await readBody(req)
  const bh = rb && rb.buf.length && !rb.truncated ? '#' + createHash('sha256').update(rb.buf).digest('hex').slice(0, 12) : ''
  const missBase = { method: req.method, url: idx.origin + req.url, bodyHash: bh || null, bodyLen: rb ? rb.buf.length : 0 }
  let sigP = null; try { sigP = req.method + ' ' + new URL(full).pathname } catch {}
  let e = null, loose = null
  if (bh) e = pick(byBody, req.method + ' ' + norm(full) + bh)   // 指纹精确命中（FIFO 消费版本）
  if (!e) {
    const cands = byNorm.get(req.method + ' ' + norm(full))
    if (cands) {
      if (bh || (rb && rb.truncated)) {
        // 带 body（或 body 被截断）但指纹没对上: 唯一变体才允许宽松回退并留痕，多个变体拒绝猜测
        if (new Set(cands.map(x => x.key)).size > 1) return rejectAmbiguous(res, 'ambiguous-body-variant', missBase)
        e = cands[0]; loose = rb && rb.truncated ? 'request-body-truncated' : 'body-variant-fallback'
      } else e = pick(byNorm, req.method + ' ' + norm(full))   // 无 body 请求（如 GET）: 同签名多响应 FIFO
    }
  }
  if (!e && sigP) {
    const cands = byPath.get(sigP)
    if (cands) {
      // 只剩 pathname 匹配（query 对不上）: 唯一候选才回退并留痕，多个候选说明 query 变体缺失
      if (new Set(cands.map(x => x.key)).size > 1) return rejectAmbiguous(res, 'ambiguous-query-variant', missBase)
      e = cands[0]; loose = rb && rb.buf.length && !bh ? 'request-body-truncated' : 'query-variant-fallback'
    }
  }
  if (loose && e) { logUnmatched({ kind: loose, ...missBase }); console.error('  [replay] ' + loose + ' ' + req.method + ' ' + req.url) }
  if (!e && isRoot) e = idx.entries.find(x => norm(x.url) === idx.startNorm && (x.ct || '').includes('html')) || idx.entries.find(x => (x.ct || '').includes('text/html')) || idx.entries[0]
  if (!e) {
    logUnmatched({ kind: 'unmatched', ...missBase })
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
  res.writeHead(e.status || 200, h); res.end(body)   // 原始状态码保留，5xx 不再改写为 200
}).on('error', err => {
  if (err.code === 'EADDRINUSE') console.error('\n  port ' + PORT + ' is busy — retry with:  PORT=' + (PORT + 1) + ' node serve.mjs\n')
  else console.error('\n  replay server error: ' + err.message + '\n')
  process.exit(1)
}).listen(PORT, HOST, () => console.log('\n  UIForge replay v2.3 → http://localhost:' + PORT + '  (' + idx.count + ' responses, ' + idx.start + ')' + (MISS_STATUS === 599 ? '  [miss→599+unmatched.jsonl, FIFO, 5xx preserved]' : '  [miss→' + MISS_STATUS + ']') + '\n'))
