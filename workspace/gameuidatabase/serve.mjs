#!/usr/bin/env node
// UIForge replay server — serves every recorded response from the archive so the site's own
// code runs offline. Exact URL match first, then normalized (volatile query params dropped),
// then pathname-only. No dependencies.
import http from 'node:http'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const idx = JSON.parse(readFileSync(path.join(HERE, 'index.json'), 'utf8'))
const norm = u => { try { const x = new URL(u); for (const p of ['_rsc','__nextDataReq','_','cb','ts','timestamp']) x.searchParams.delete(p); return x.origin + x.pathname + (x.search || '') } catch { return u } }
const byKey = new Map(), byNorm = new Map(), byPath = new Map()
for (const e of idx.entries) { byKey.set(e.key, e); byNorm.set(e.method + ' ' + norm(e.url), e); try { byPath.set(e.method + ' ' + new URL(e.url).pathname, e) } catch {} }
const PORT = +(process.env.PORT || 8787)
const HOST = process.env.HOST || '127.0.0.1'   // local replay; set HOST=0.0.0.0 to expose it
// 跨域依赖本地化：站点从 cdn.jsdelivr.net / code.jquery.com / fonts.g* 等域名加载的资源也在归档里，
// 但绝对 URL 在本地回放时指向真实互联网（离线即 404）。这里把已归档的主机名从 HTML/CSS 中改成
// 根相对路径，请求就会落到本服务器，由 byPath（只按 pathname 匹配）命中归档条目。
const archivedHosts = [...new Set(idx.entries.map(e => { try { return new URL(e.url).host } catch { return null } }).filter(Boolean))]
const localizeHosts = s => {
  for (const h of archivedHosts) for (const pre of ['https://' + h, 'http://' + h, '//' + h]) s = s.split(pre).join('')
  return s.split('="//').join('="/')   // 站点里有 https://host//x.svg 这种双斜杠，剥主机后要收敛成 /x.svg
}
// 冻结时间的目的是「可复现」，但完全冻结会把首页数字滚动动画钉在 0（动画按 Date.now() 差值推进）。
// 因此改成偏移虚拟时钟：起点固定 1751328000000，之后随 performance.now() 正常前进。
const inject = `<script>(function(){try{var _d=Date,_b=1751328000000,_t0=performance.now();var now=function(){return _b+(performance.now()-_t0)};Date=class extends _d{constructor(...a){if(a.length)super(...a);else super(now())}static now(){return now()}};}catch(e){}
navigator.sendBeacon=function(){return true};try{window.WebSocket=function(){return{send:function(){},close:function(){},addEventListener:function(){}}}}catch(e){}})();</script>`
http.createServer((req, res) => {
  const full = idx.origin + req.url
  const isRoot = req.url === '/' || req.url === '' || req.url.startsWith('/?')
  let e = byKey.get(req.method + ' ' + full) || byNorm.get(req.method + ' ' + norm(full)) || byPath.get(req.method + ' ' + (req.url.split('?')[0]))
  if (!e && isRoot) e = idx.entries.find(x => norm(x.url) === idx.startNorm && (x.ct || '').includes('html')) || idx.entries.find(x => (x.ct || '').includes('text/html')) || idx.entries[0]
  if (!e) {
    if (process.env.LOG_MISSES) console.error('  [miss] ' + req.method + ' ' + req.url)
    res.writeHead(204, { 'access-control-allow-origin': '*' }); return res.end()
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
  if ((e.ct || '').includes('text/html')) {
    // 统计脚本（GA/GTM）离线时只会朝外网打点，回放里直接摘掉——不影响页面渲染
    let s = body.toString('utf8').replace(/<script[^>]*(?:googletagmanager|google-analytics|cloudflareinsights)[^>]*>\s*<\/script>/gi, '')
    s = localizeHosts(s).replace(/<head[^>]*>/i, m => m + inject); body = Buffer.from(s) }
  else if ((e.ct || '').includes('text/css')) body = Buffer.from(localizeHosts(body.toString('utf8')))
  h['content-length'] = body.length
  res.writeHead(e.status && e.status < 500 ? e.status : 200, h); res.end(body)
}).on('error', err => {
  if (err.code === 'EADDRINUSE') console.error('\n  port ' + PORT + ' is busy — retry with:  PORT=' + (PORT + 1) + ' node serve.mjs\n')
  else console.error('\n  replay server error: ' + err.message + '\n')
  process.exit(1)
}).listen(PORT, HOST, () => console.log('\n  UIForge replay → http://localhost:' + PORT + '  (' + idx.count + ' responses, ' + idx.start + ')\n'))
