// Batch 7 冒烟：Stream Capture & Replay
// 1 真实样本回放：用 bishuxiezuo 归档中已采集的真实 SSE（22 帧）验证 content-type、
//   事件数量、事件顺序、结束事件
// 2 本地合成：注入采集器（stream-capture-inject.js）在合成页面上包装 fetch-SSE / fetch-NDJSON / WebSocket，
//   验证三种传输都能被捕获（不依赖实站、不消耗 AI 额度）
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdirSync, readFileSync, rmSync, copyFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import http from 'node:http'
import { createHash } from 'node:crypto'

const ROOT = resolve(import.meta.dirname, '..', '..')
const serveSrc = join(ROOT, '.claude', 'skills', 'uiforge-site-clone', 'scripts', 'replay-serve-v2.mjs')
const injectSrc = join(ROOT, 'workspace', 'bishuxiezuo', 'stream-capture-inject.js')
const realArchive = join(ROOT, 'workspace', 'bishuxiezuo', 'archive-bishu')
const req = createRequire(new URL('../../workspace/common/package.json', import.meta.url).href)
const pw = await import(pathToFileURL(req.resolve('playwright')).href)
const chromium = pw.chromium ?? (pw.default && pw.default.chromium)

let fails = 0
const assert = (cond, msg, extra) => { if (!cond) { fails++; console.error('断言失败:', msg, extra !== undefined ? extra : '') } else console.log('ok ', msg) }

// ---------- 1 真实 SSE 回放 ----------
const tmp = join(import.meta.dirname, 'tmp')
rmSync(tmp, { recursive: true, force: true })
const arch = join(tmp, 'archive')
mkdirSync(arch, { recursive: true })
copyFileSync(join(realArchive, 'index.json'), join(arch, 'index.json'))
copyFileSync(serveSrc, join(arch, 'serve.mjs'))
try { copyFileSync(join(realArchive, 'replay-policies.json'), join(arch, 'replay-policies.json')) } catch {}
const manifestPath = join(realArchive, 'streams', 'manifest.json')
if (!existsSync(manifestPath)) { console.error('缺少真实流式样本（先运行 capture-steps 的 sse: 步骤）'); process.exit(1) }
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const sample = manifest[0]
const dstDir = join(arch, 'streams', sample.file.replace(/\/[^/]+$/, ''))
mkdirSync(dstDir, { recursive: true })
copyFileSync(join(realArchive, 'streams', sample.file), join(arch, 'streams', sample.file))
writeFileSync(join(arch, 'streams', 'manifest.json'), JSON.stringify([sample]))

const port = 8801
const srv = spawn(process.execPath, [join(arch, 'serve.mjs')], { cwd: arch, env: { ...process.env, PORT: String(port), REPLAY_STREAM_DELAY: '1' }, stdio: ['ignore', 'pipe', 'pipe'] })
const logs = []
srv.stdout.on('data', d => logs.push(String(d))); srv.stderr.on('data', d => logs.push(String(d)))
const base = 'http://127.0.0.1:' + port
for (let i = 0; i < 40; i++) { try { const r = await fetch(base + '/'); if (r.status) break } catch {} await new Promise(r => setTimeout(r, 250)) }

try {
  const r = await fetch(base + sample.path + '?after_id=999', { headers: { accept: 'text/event-stream' } })
  assert(r.status === 200, '真实 SSE 回放返回 200', r.status)
  assert((r.headers.get('content-type') || '').includes('text/event-stream'), 'Content-Type 为 text/event-stream', r.headers.get('content-type'))
  const text = await r.text()
  const frames = text.split('\n\n').filter(x => x.trim())
  assert(frames.length === sample.frames, '帧数与原录制一致', JSON.stringify({ got: frames.length, want: sample.frames }))
  const evs = frames.map(f => (/event: (\w+)/.exec(f) || [])[1]).filter(Boolean)
  assert(evs[0] === 'job_started', '首事件 job_started', evs[0])
  assert(evs[evs.length - 1] === 'job_completed', '末事件 job_completed（结束事件正确）', evs[evs.length - 1])
  // 与录制帧逐帧比对（不手工推导顺序，直接以事实为准）
  const recorded = readFileSync(join(realArchive, 'streams', sample.file), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  const wantEvs = recorded.map(f => (/event: (\w+)/.exec(f.raw) || [])[1])
  assert(JSON.stringify(evs) === JSON.stringify(wantEvs), '事件顺序与录制帧完全一致（' + wantEvs.length + ' 帧）', evs.join(',') + ' vs ' + wantEvs.join(','))
  const wantRaw = recorded.map(f => f.raw)
  assert(JSON.stringify(frames) === JSON.stringify(wantRaw), '帧原文逐字一致（含 id/event/data 行）')
  const ids = frames.map(f => (/id: (\d+)/.exec(f) || [])[1])
  assert(ids.every(Boolean) && new Set(ids).size === ids.length, 'SSE id 全部保留且唯一', ids.slice(0, 3).join(','))
  const unmatched = existsSync(join(arch, 'unmatched-requests.jsonl')) ? readFileSync(join(arch, 'unmatched-requests.jsonl'), 'utf8') : ''
  assert(!unmatched.includes('/stream'), '流式端点未计入 unmatched（事件级回放生效）')
} finally { srv.kill() }

// ---------- 2 本地合成采集器验证（三种传输） ----------
const pagesrv = http.createServer((rq, rs) => {
  if (rq.url === '/') {
    rs.writeHead(200, { 'content-type': 'text/html' })
    return rs.end(`<!doctype html><html><body><div id="out">init</div><script>
      window.addEventListener('load', async () => {
        const o = document.getElementById('out')
        // 1 fetch SSE
        const r1 = await fetch('/sse', { headers: { accept: 'text/event-stream' } })
        ;(async () => { const t = await r1.text(); o.dataset.sse = t.length })()
        // 2 fetch NDJSON
        const r2 = await fetch('/ndjson')
        ;(async () => { const t = await r2.text(); o.dataset.nd = t.length })()
        // 3 EventSource
        const es = new EventSource('/es')
        es.addEventListener('message', e => { o.dataset.es = (o.dataset.es || '') + e.data })
        // 4 WebSocket
        const ws = new WebSocket('ws://' + location.host + '/ws')
        ws.addEventListener('open', () => ws.send('hello-from-page'))
        ws.addEventListener('message', e => { o.dataset.ws = e.data })
      })
    </script></body></html>`)
  }
  if (rq.url === '/sse') {
    rs.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8' })
    rs.write('id: 1\nevent: job_started\ndata: {"s":"started"}\n\n')
    setTimeout(() => { rs.write('id: 2\nevent: stage_started\ndata: {"s":"stage"}\n\n'); }, 30)
    setTimeout(() => { rs.write('id: 3\nevent: job_completed\ndata: {"s":"done"}\n\n'); rs.end() }, 60)
    return
  }
  if (rq.url === '/ndjson') {
    rs.writeHead(200, { 'content-type': 'application/x-ndjson' })
    rs.write('{"n":1}\n'); rs.write('{"n":2}\n'); return rs.end('{"n":3}\n')
  }
  if (rq.url === '/es') {
    rs.writeHead(200, { 'content-type': 'text/event-stream' })
    rs.write('event: message\ndata: es-1\n\n')
    setTimeout(() => { rs.write('event: message\ndata: es-2\n\n'); rs.end() }, 40)
    return
  }
  rs.writeHead(404); rs.end()
})
// 极简 WS 握手 + 单帧（仅够验证采集器）
pagesrv.on('upgrade', (rq, socket) => {
  const key = rq.headers['sec-websocket-key']
  const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
  const head = ['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', 'Sec-WebSocket-Accept: ' + accept, '', ''].join('\r\n')
  socket.write(head)
  socket.on('data', () => {
    const payload = Buffer.from('ws-pong')
    socket.write(Buffer.concat([Buffer.from([0x81, payload.length]), payload]))
  })
  setTimeout(() => socket.destroy(), 1500)
})

await new Promise(r => pagesrv.listen(8802, '127.0.0.1', r))
const browser = await chromium.launch()
const page = await browser.newPage()
await page.addInitScript(readFileSync(injectSrc, 'utf8'))
await page.goto('http://127.0.0.1:8802/', { waitUntil: 'load' })
await page.waitForTimeout(2500)
const recs = await page.evaluate(() => (window.__streamRec || []).map(r => ({ transport: r.transport, frames: r.frames.length, terminal: r.terminal, urls: r.url.slice(-12) })))
const byT = Object.fromEntries(recs.map(r => [r.transport, r]))
assert(!!byT['fetch-sse'] && byT['fetch-sse'].frames === 3, '合成 fetch-SSE 捕获 3 帧', JSON.stringify(byT['fetch-sse']))
assert(!!byT['fetch-ndjson'] && byT['fetch-ndjson'].frames === 3, '合成 fetch-NDJSON 捕获 3 帧', JSON.stringify(byT['fetch-ndjson']))
assert(!!byT['eventsource'] && byT['eventsource'].frames >= 2, '合成 EventSource 捕获 ≥2 事件', JSON.stringify(byT['eventsource']))
assert(!!byT['websocket'] && byT['websocket'].frames >= 2, '合成 WebSocket 捕获双向帧（send+recv）', JSON.stringify(byT['websocket']))
const pageState = await page.evaluate(() => ({ sse: document.getElementById('out').dataset.sse, nd: document.getElementById('out').dataset.nd, es: document.getElementById('out').dataset.es, ws: document.getElementById('out').dataset.ws }))
assert(pageState.sse && Number(pageState.sse) > 0, '采集器不影响原应用消费 SSE（应用仍拿到完整 body）', JSON.stringify(pageState))
await browser.close()
pagesrv.close()

console.log('stream smoke done, fails =', fails)
process.exitCode = fails ? 1 : 0
