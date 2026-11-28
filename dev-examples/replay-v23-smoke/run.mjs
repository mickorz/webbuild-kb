// Replay v2.3 冒烟检查: 合成归档 + serve v2.3，断言响应内容（不只看状态码）
// 覆盖: query 顺序归一化、同签名多响应 FIFO（GET/POST）、query 歧义拒绝、唯一候选回退留痕、
//       5xx 原样保留、指纹命中、变体回退留痕、截断请求体不做指纹匹配
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, readFileSync, rmSync, copyFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const ROOT = resolve(import.meta.dirname, '..', '..')
const serveSrc = join(ROOT, '.claude', 'skills', 'uiforge-site-clone', 'scripts', 'replay-serve-v2.mjs')
const tmp = join(import.meta.dirname, 'tmp')
rmSync(tmp, { recursive: true, force: true })
const arch = join(tmp, 'archive')
mkdirSync(join(arch, 'files'), { recursive: true })

const sha12 = s => createHash('sha256').update(s).digest('hex').slice(0, 12)
const origin = 'http://127.0.0.1:8933'
const emptyHash = sha12('{}')
const entries = []
const put = (method, url, status, obj, keyExtra = '', reqBody) => {
  const key = method + ' ' + origin + url + keyExtra
  const file = 'f' + entries.length + '.json'
  writeFileSync(join(arch, 'files', file), JSON.stringify(obj))
  const e = { key, method, url: origin + url, status, headers: { 'content-type': 'application/json' }, file, ct: 'application/json' }
  if (reqBody !== undefined) e.reqBody = reqBody
  entries.push(e)
}
put('GET', '/api/books?b=2&a=1', 200, { v: 'page2' })                       // query 乱序录入
put('GET', '/api/list?page=1', 200, { v: 'p1' })
put('GET', '/api/list?page=2', 200, { v: 'p2' })
put('GET', '/api/single', 200, { v: 'only' })
put('GET', '/api/broken', 500, { v: 'boom' })
put('POST', '/api/echo', 200, { v: 'echo-empty' }, '#' + emptyHash, '{}')
put('POST', '/api/session', 200, { n: 1 }, '#' + emptyHash, '{}')           // 同签名版本 1
put('POST', '/api/session', 200, { n: 2 }, '#' + emptyHash, '{}')           // 同签名版本 2
put('GET', '/api/state', 200, { n: 1 })                                     // 同 GET 不同业务状态
put('GET', '/api/state', 200, { n: 2 })
put('POST', '/api/upload', 200, { v: 'uploaded' })                          // 旧格式无指纹条目
writeFileSync(join(arch, 'index.json'), JSON.stringify({ origin, startNorm: origin + '/', startUrl: origin + '/', count: entries.length, entries }))
copyFileSync(serveSrc, join(arch, 'serve.mjs'))

const port = 8793
const child = spawn(process.execPath, [join(arch, 'serve.mjs')], { cwd: arch, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] })
await new Promise(r => setTimeout(r, 1200))
const base = 'http://127.0.0.1:' + port
const req2 = async (p, opts) => { const r = await fetch(base + p, opts); return { status: r.status, text: await r.text() } }
let fails = 0
const assert = (cond, msg, extra) => { if (!cond) { fails++; console.error('断言失败:', msg, extra !== undefined ? extra : '') } else console.log('ok ', msg) }
const J = t => { try { return JSON.parse(t) } catch { return null } }
const post = (p, body) => req2(p, { method: 'POST', body })

try {
  let r = await req2('/api/books?a=1&b=2')                                  // 参数顺序与录入不同
  assert(r.status === 200 && J(r.text)?.v === 'page2', 'T2 query 顺序归一化精确匹配', r.text)

  r = await post('/api/session', '{}')
  assert(r.status === 200 && J(r.text)?.n === 1, 'T1 FIFO 第1次消费版本1', r.text)
  r = await post('/api/session', '{}')
  assert(J(r.text)?.n === 2, 'T1 FIFO 第2次消费版本2', r.text)
  r = await post('/api/session', '{}')
  assert(J(r.text)?.n === 2, 'T1 FIFO 超出后停在最后一版', r.text)

  r = await req2('/api/state'); assert(J(r.text)?.n === 1, 'T1 GET FIFO 版本1', r.text)
  r = await req2('/api/state'); assert(J(r.text)?.n === 2, 'T1 GET FIFO 版本2', r.text)
  r = await req2('/api/state'); assert(J(r.text)?.n === 2, 'T1 GET FIFO 停在最后一版', r.text)

  r = await req2('/api/list?page=3')
  assert(r.status === 599 && J(r.text)?.error === 'ambiguous-replay-variant', 'T2 query 多候选拒绝猜测', r.status + ' ' + r.text)

  r = await req2('/api/single?x=9')
  assert(r.status === 200 && J(r.text)?.v === 'only', 'T2 query 唯一候选允许回退', r.text)

  r = await req2('/api/broken')
  assert(r.status === 500 && J(r.text)?.v === 'boom', 'T3 录制 5xx 原样回放', r.status + ' ' + r.text)

  r = await post('/api/echo', '{}')
  assert(r.status === 200 && J(r.text)?.v === 'echo-empty', '指纹精确命中', r.text)
  r = await post('/api/echo', '{"other":1}')
  assert(r.status === 200 && J(r.text)?.v === 'echo-empty', '唯一变体 body 回退', r.status)

  const big = 'x'.repeat(11 * 1024 * 1024)
  r = await post('/api/upload', big)
  assert(r.status === 200 && J(r.text)?.v === 'uploaded', 'T4 截断请求体回退唯一变体', r.status)

  r = await req2('/api/none')
  assert(r.status === 599 && J(r.text)?.error === 'unmatched-replay-request', '未命中 599', r.status)

  const lines = readFileSync(join(arch, 'unmatched-requests.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  const kinds = new Set(lines.map(l => l.kind))
  for (const k of ['ambiguous-query-variant', 'query-variant-fallback', 'body-variant-fallback', 'request-body-truncated', 'unmatched'])
    assert(kinds.has(k), '留痕 kind: ' + k)
} finally {
  child.kill()
}
console.log('replay-v23 smoke done, fails =', fails)
process.exitCode = fails ? 1 : 0
