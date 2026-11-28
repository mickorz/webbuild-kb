// Batch 7/8 流式冒烟：Stream Capture & Replay + 游标语义 + 时序模式 + 边界
// 1 真实 SSE 回放：帧数/顺序/逐字/id/unmatched
// 2 游标语义：after_id=N → 仅 id>N；N>=maxId → 空流（与线上实测一致）
// 3 时序模式：instant 快速 vs recorded 按录制 deltaMs
// 4 采集器边界：fetch-SSE、NDJSON、CRLF 分帧、UTF-8 跨块、EventSource 自定义事件、WS 文本+二进制
// 5 采集器不干扰原应用
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdirSync, readFileSync, rmSync, copyFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import http from 'node:http'

const ROOT = resolve(import.meta.dirname, '..', '..')
const serveSrc = join(ROOT, '.claude', 'skills', 'uiforge-site-clone', 'scripts', 'replay-serve-v2.mjs')
const injectSrc = join(ROOT, 'workspace', 'bishuxiezuo', 'stream-capture-inject.js')
const realArchive = join(ROOT, 'workspace', 'bishuxiezuo', 'archive-bishu')
const req = createRequire(new URL('../../workspace/common/package.json', import.meta.url).href)
const pw = await import(pathToFileURL(req.resolve('playwright')).href)
const chromium = pw.chromium ?? (pw.default && pw.default.chromium)

let fails = 0
const assert = (cond, msg, extra) => { if (!cond) { fails++; console.error('断言失败:', msg, extra !== undefined ? extra : '') } else console.log('ok ', msg) }
const sleep = ms => new Promise(r => setTimeout(r, ms))
const waitUp = async base => { for (let i = 0; i < 50; i++) { try { const r = await fetch(base + '/'); if (r.status) return true } catch {} await sleep(200) } return false }

const tmp = join(import.meta.dirname, 'tmp')
rmSync(tmp, { recursive: true, force: true })
const manifestPath = join(realArchive, 'streams', 'manifest.json')
if (!existsSync(manifestPath)) { console.error('缺少真实流式样本（先运行 capture-steps 的 sse: 步骤）'); process.exit(1) }
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const sample = manifest[0]
const recordedFrames = readFileSync(join(realArchive, 'streams', sample.file), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))

// ---------- 1+2 真实 SSE 回放与游标 ----------
const arch = join(tmp, 'archive')
mkdirSync(join(arch, 'streams', sample.file.replace(/\/[^/]+$/, '')), { recursive: true })
copyFileSync(join(realArchive, 'index.json'), join(arch, 'index.json'))
copyFileSync(serveSrc, join(arch, 'serve.mjs'))
try { copyFileSync(join(realArchive, 'replay-policies.json'), join(arch, 'replay-policies.json')) } catch {}
copyFileSync(join(realArchive, 'streams', sample.file), join(arch, 'streams', sample.file))
writeFileSync(join(arch, 'streams', 'manifest.json'), JSON.stringify([sample]))

const port = 8801
const srv = spawn(process.execPath, [join(arch, 'serve.mjs')], { cwd: arch, env: { ...process.env, PORT: String(port), REPLAY_STREAM_MODE: 'instant', REPLAY_STREAM_DELAY: '1' }, stdio: ['ignore', 'pipe', 'pipe'] })
srv.stdout.on('data', () => {}); srv.stderr.on('data', () => {})
const base = 'http://127.0.0.1:' + port
if (!await waitUp(base)) { console.error('serve 启动失败'); process.exit(1) }

const readStream = async (q) => {
  const r = await fetch(base + sample.path + q, { headers: { accept: 'text/event-stream' } })
  const text = await r.text()
  return { status: r.status, ct: r.headers.get('content-type'), hdr: r.headers.get('x-replay-stream'), frames: text.split('\n\n').filter(x => x.trim()) }
}

try {
  const full = await readStream('?after_id=0')
  assert(full.status === 200, '真实 SSE 回放返回 200', full.status)
  assert((full.ct || '').includes('text/event-stream'), 'Content-Type 为 text/event-stream', full.ct)
  assert(full.frames.length === sample.frames, '帧数与原录制一致', JSON.stringify({ got: full.frames.length, want: sample.frames }))
  const evs = full.frames.map(f => (/event: (\w+)/.exec(f) || [])[1])
  const wantEvs = recordedFrames.map(f => (/event: (\w+)/.exec(f.raw) || [])[1])
  assert(evs[0] === 'job_started', '首事件 job_started', evs[0])
  assert(evs[evs.length - 1] === 'job_completed', '末事件 job_completed', evs[evs.length - 1])
  assert(JSON.stringify(evs) === JSON.stringify(wantEvs), `事件顺序与录制帧完全一致（${wantEvs.length} 帧）`)
  assert(JSON.stringify(full.frames) === JSON.stringify(recordedFrames.map(f => f.raw)), '帧原文逐字一致（含 id/event/data 行）')
  const ids = full.frames.map(f => (/id: (\d+)/.exec(f) || [])[1])
  assert(ids.every(Boolean) && new Set(ids).size === ids.length, 'SSE id 全部保留且唯一')

  // 游标语义
  const idsAll = recordedFrames.map(f => Number((/id: (\d+)/.exec(f.raw) || [])[1]))
  const maxId = Math.max(...idsAll)
  const midId = idsAll[4]
  const c0 = await readStream('?after_id=0')
  assert(c0.frames.length === 22, '游标 after_id=0 → 全部 22 帧', c0.frames.length)
  const cMid = await readStream('?after_id=' + midId)
  assert(cMid.frames.length === 22 - 5, `游标 after_id=${midId} → 其后 17 帧`, cMid.frames.length)
  const cMax = await readStream('?after_id=' + maxId)
  assert(cMax.frames.length === 0, '游标 after_id=maxId → 空流', cMax.frames.length)
  const unmatched = existsSync(join(arch, 'unmatched-requests.jsonl')) ? readFileSync(join(arch, 'unmatched-requests.jsonl'), 'utf8') : ''
  assert(!unmatched.includes('/stream'), '流式端点未计入 unmatched')
} finally { srv.kill() }

// ---------- 3 时序模式 ----------
const timingArch = join(tmp, 'timing')
mkdirSync(join(timingArch, 'streams'), { recursive: true })
writeFileSync(join(timingArch, 'index.json'), JSON.stringify({ origin: 'http://127.0.0.1:8803', startNorm: '/', startUrl: '/', count: 0, entries: [] }))
copyFileSync(serveSrc, join(timingArch, 'serve.mjs'))
const tframes = [
  { seq: 1, deltaMs: 0, raw: 'id: 1\ndata: a' },
  { seq: 2, deltaMs: 200, raw: 'id: 2\ndata: b' },
  { seq: 3, deltaMs: 400, raw: 'id: 3\ndata: c' },
  { seq: 4, deltaMs: 600, raw: 'id: 4\ndata: d' }
]
writeFileSync(join(timingArch, 'streams', 'slow.jsonl'), tframes.map(f => JSON.stringify(f)).join('\n') + '\n')
writeFileSync(join(timingArch, 'streams', 'manifest.json'), JSON.stringify([{ method: 'GET', path: '/api/slow/stream', url: 'http://127.0.0.1:8803/api/slow/stream', status: 200, contentType: 'text/event-stream', transport: 'fetch-sse', file: 'slow.jsonl', frames: 4, terminal: 'eof' }]))
const timeRun = async (mode, p, q = '') => {
  const child = spawn(process.execPath, [join(timingArch, 'serve.mjs')], { cwd: timingArch, env: { ...process.env, PORT: String(p), REPLAY_STREAM_MODE: mode, REPLAY_STREAM_DELAY: '0' }, stdio: ['ignore', 'pipe', 'pipe'] })
  let bootLog = ''
  child.stdout.on('data', d => { bootLog += String(d) })
  child.stderr.on('data', d => { bootLog += String(d) })
  const b = 'http://127.0.0.1:' + p
  if (!await waitUp(b)) { child.kill(); return { ms: -1, frames: 0 } }
  const t0 = Date.now()
  const r = await fetch(b + '/api/slow/stream' + q, { headers: { accept: 'text/event-stream' } })
  const txt = await r.text()
  const ms = Date.now() - t0
  child.kill()
  return { ms, frames: txt.split('\n\n').filter(x => x.trim()).length }
}
const inst = await timeRun('instant', 8803)
const rec = await timeRun('recorded', 8804)
// 8.1: 游标续读的时间基准（after_id=2 → 首帧 C 立即发，再 200ms 后 D）
const recCursor = await timeRun('recorded', 8805, '?after_id=2')
assert(inst.frames === 4 && rec.frames === 4, '两种时序模式帧数一致', JSON.stringify({ inst, rec }))
assert(inst.ms >= 0 && inst.ms < 200, 'instant 模式快速回放（<200ms）', inst.ms + 'ms')
assert(rec.ms >= 500, 'recorded 模式按录制 deltaMs 回放（>=500ms）', rec.ms + 'ms')
assert(recCursor.frames === 2, 'recorded+游标 after_id=2 → 2 帧（C/D）', JSON.stringify(recCursor))
assert(recCursor.ms >= 120 && recCursor.ms < 450, 'recorded+游标首帧不等待前序时长（约 200ms，非 400ms+）', recCursor.ms + 'ms')

// ---------- 4+5 采集器边界（本地合成，不依赖实站） ----------
const pagesrv = http.createServer((rq, rs) => {
  if (rq.url === '/') {
    rs.writeHead(200, { 'content-type': 'text/html' })
    return rs.end(`<!doctype html><html><body><div id="out">init</div><script>
      window.addEventListener('load', async () => {
        const o = document.getElementById('out')
        const r1 = await fetch('/sse', { headers: { accept: 'text/event-stream' } })
        ;(async () => { o.dataset.sse = (await r1.text()).length })()
        const r2 = await fetch('/ndjson')
        ;(async () => { o.dataset.nd = (await r2.text()).length })()
        await (await fetch('/crlf', { headers: { accept: 'text/event-stream' } })).text()
        await (await fetch('/utf8', { headers: { accept: 'text/event-stream' } })).text()
        const es2 = new EventSource('/custom')
        es2.addEventListener('stage_ready', () => {})
        es2.addEventListener('stage_completed', () => {})
        const es = new EventSource('/es')
        es.addEventListener('message', e => { o.dataset.es = (o.dataset.es || '') + e.data })
        const ws = new WebSocket('ws://' + location.host + '/ws')
        ws.addEventListener('open', () => ws.send('hello-from-page'))
        ws.addEventListener('message', e => { o.dataset.ws = String(e.data).slice(0, 20) })
      })
    </script></body></html>`)
  }
  if (rq.url === '/sse') {
    rs.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8' })
    rs.write('id: 1\nevent: job_started\ndata: {"s":"started"}\n\n')
    setTimeout(() => { rs.write('id: 2\nevent: stage_started\ndata: {"s":"stage"}\n\n') }, 30)
    setTimeout(() => { rs.write('id: 3\nevent: job_completed\ndata: {"s":"done"}\n\n'); rs.end() }, 60)
    return
  }
  if (rq.url === '/ndjson') { rs.writeHead(200, { 'content-type': 'application/x-ndjson' }); rs.write('{"n":1}\n'); rs.write('{"n":2}\n'); return rs.end('{"n":3}\n') }
  if (rq.url === '/crlf') {
    rs.writeHead(200, { 'content-type': 'text/event-stream' })
    rs.write('id: 1\r\nevent: a\r\ndata: {"x":1}\r\n\r\n')
    rs.write('id: 2\r\nevent: b\r\ndata: {"x":2}\r\n\r\n')
    return rs.end()
  }
  if (rq.url === '/utf8') {
    rs.writeHead(200, { 'content-type': 'text/event-stream' })
    const buf = Buffer.from('id: 1\nevent: msg\ndata: 中文跨块\n\n')
    rs.write(buf.slice(0, 24))
    setTimeout(() => { rs.write(buf.slice(24)); rs.end() }, 30)
    return
  }
  if (rq.url === '/custom') {
    rs.writeHead(200, { 'content-type': 'text/event-stream' })
    rs.write('event: stage_ready\ndata: stage-one\n\n')
    setTimeout(() => { rs.write('event: stage_completed\ndata: stage-two\n\n'); rs.end() }, 30)
    return
  }
  if (rq.url === '/es') {
    rs.writeHead(200, { 'content-type': 'text/event-stream' })
    rs.write('event: message\ndata: es-1\n\n')
    setTimeout(() => { rs.write('event: message\ndata: es-2\n\n'); rs.end() }, 40)
    return
  }
  rs.writeHead(404); rs.end()
})
pagesrv.on('upgrade', (rq, socket) => {
  const key = rq.headers['sec-websocket-key']
  const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
  socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', 'Sec-WebSocket-Accept: ' + accept, '', ''].join('\r\n'))
  socket.on('data', () => {
    const txt = Buffer.from('ws-pong')
    socket.write(Buffer.concat([Buffer.from([0x81, txt.length]), txt]))
    const bin = Buffer.from([1, 2, 3, 4])
    socket.write(Buffer.concat([Buffer.from([0x82, bin.length]), bin]))
  })
  setTimeout(() => socket.destroy(), 1800)
})
await new Promise(r => pagesrv.listen(8802, '127.0.0.1', r))

const browser = await chromium.launch()
const page = await browser.newPage()
await page.addInitScript(readFileSync(injectSrc, 'utf8'))
await page.goto('http://127.0.0.1:8802/', { waitUntil: 'load' })
await sleep(2500)
const recs = await page.evaluate(() => (window.__streamRec || []).map(r => ({ transport: r.transport, frames: r.frames.length, urls: r.url.slice(-14), raw: r.frames.map(f => f.raw) })))
const by = k => recs.filter(r => r.urls.includes(k))[0]
assert(by('/sse')?.frames === 3, '合成 fetch-SSE 捕获 3 帧', JSON.stringify(by('/sse')?.frames))
assert(by('/ndjson')?.frames === 3, '合成 fetch-NDJSON 捕获 3 帧', JSON.stringify(by('/ndjson')?.frames))
assert(by('/crlf')?.frames === 2, 'CRLF 分帧解析为 2 帧', JSON.stringify(by('/crlf')?.frames))
assert(by('/utf8')?.frames === 1 && JSON.stringify(by('/utf8')?.raw).includes('中文跨块'), 'UTF-8 跨 chunk 正确重组', JSON.stringify(by('/utf8')?.raw).slice(0, 80))
const custom = by('/custom')
assert(!!custom && custom.frames >= 2 && custom.raw.some(r => r.includes('event: stage_ready')), 'EventSource 自定义事件类型被记录', JSON.stringify(custom?.raw).slice(0, 120))
const es = by('/es')
assert(!!es && es.frames >= 2, 'EventSource message 事件被记录', JSON.stringify(es?.frames))
const ws = recs.filter(r => r.transport === 'websocket')[0]
assert(!!ws && ws.frames >= 2, 'WebSocket 双向帧被记录', JSON.stringify(ws?.frames))
assert(JSON.stringify(ws?.raw).includes('base64:') && JSON.stringify(ws?.raw).includes('ws-pong'), 'WebSocket 文本与二进制帧均保留真实内容', JSON.stringify(ws?.raw).slice(0, 100))
const pageState = await page.evaluate(() => ({ sse: document.getElementById('out').dataset.sse, nd: document.getElementById('out').dataset.nd, es: document.getElementById('out').dataset.es }))
assert(pageState.sse && Number(pageState.sse) > 0 && pageState.nd && Number(pageState.nd) > 0, '采集器不影响原应用消费流式响应', JSON.stringify(pageState))
await browser.close()
pagesrv.close()

console.log('stream smoke done, fails =', fails)
process.exitCode = fails ? 1 : 0
