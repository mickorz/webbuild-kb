// Batch 6 冒烟：Endpoint Replay Policy（fifo / latest）
// 验收对照（用户指定 6 项）:
//   1 默认 FIFO 仍按旧顺序消费
//   2 GET latest 每次都返回最新版本
//   3 GET events FIFO: queued → running → completed
//   4 POST FIFO 保持多版本行为
//   5 body 不匹配仍 599
//   6 多 query 候选仍拒绝猜测
// 另验证: :id 通配规则生效、策略不影响指纹匹配、不含 replay-policies.json 的归档保持纯 FIFO（向后兼容）
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, readFileSync, rmSync, copyFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const ROOT = resolve(import.meta.dirname, '..', '..')
const serveSrc = join(ROOT, '.claude', 'skills', 'uiforge-site-clone', 'scripts', 'replay-serve-v2.mjs')
const tmp = join(import.meta.dirname, 'tmp')
rmSync(tmp, { recursive: true, force: true })
const origin = 'http://127.0.0.1:8935'
const sha12 = s => createHash('sha256').update(s).digest('hex').slice(0, 12)

const mkArchive = (dir, policies) => {
  mkdirSync(join(dir, 'files'), { recursive: true })
  const entries = []
  const put = (method, url, status, obj, keyExtra = '', reqBody) => {
    const key = method + ' ' + origin + url + keyExtra
    const file = 'f' + entries.length + '.json'
    writeFileSync(join(dir, 'files', file), JSON.stringify(obj))
    const e = { key, method, url: origin + url, status, headers: { 'content-type': 'application/json' }, file, ct: 'application/json' }
    if (reqBody !== undefined) e.reqBody = reqBody
    entries.push(e)
  }
  return { put, entries, done: () => {
    writeFileSync(join(dir, 'index.json'), JSON.stringify({ origin, startNorm: origin + '/', startUrl: origin + '/', count: entries.length, entries }))
    copyFileSync(serveSrc, join(dir, 'serve.mjs'))
    if (policies) writeFileSync(join(dir, 'replay-policies.json'), JSON.stringify(policies))
  } }
}

// A: 带策略的归档
const archA = join(tmp, 'with-policy'); mkdirSync(archA, { recursive: true })
const A = mkArchive(archA, {
  default: 'fifo',
  rules: [
    { method: 'GET', path: '/api/books', mode: 'latest' },
    { method: 'GET', path: '/api/books/:id/world', mode: 'latest' }
  ]
})
A.put('GET', '/api/books', 200, { v: 'list-before-create' })
A.put('GET', '/api/books', 200, { v: 'list-after-create' })
A.put('GET', '/api/books/b1/world', 200, { status: 'building' })
A.put('GET', '/api/books/b1/world', 200, { status: 'ready' })
A.put('GET', '/api/engine-tasks/t1/events', 200, { s: 'queued' })
A.put('GET', '/api/engine-tasks/t1/events', 200, { s: 'running' })
A.put('GET', '/api/engine-tasks/t1/events', 200, { s: 'completed' })
const emptyHash = '#' + sha12('{}')
A.put('POST', '/api/session', 200, { n: 1 }, emptyHash, '{}')
A.put('POST', '/api/session', 200, { n: 2 }, emptyHash, '{}')
A.put('POST', '/api/session', 200, { n: 9 }, '#' + sha12('{"y":2}'), '{"y":2}')   // 第二个变体: 使 body 不匹配时成为歧义
A.put('GET', '/api/list?page=1', 200, { v: 'p1' })
A.put('GET', '/api/list?page=2', 200, { v: 'p2' })
A.done()

// B: 无策略文件的归档（向后兼容，应全 FIFO）
const archB = join(tmp, 'no-policy'); mkdirSync(archB, { recursive: true })
const Bx = mkArchive(archB, null)
Bx.put('GET', '/api/books', 200, { v: 'old' })
Bx.put('GET', '/api/books', 200, { v: 'new' })
Bx.done()

const start = async (dir, port) => {
  const child = spawn(process.execPath, [join(dir, 'serve.mjs')], { cwd: dir, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] })
  const log = []
  child.stdout.on('data', d => log.push(String(d))); child.stderr.on('data', d => log.push(String(d)))
  const base = 'http://127.0.0.1:' + port
  for (let i = 0; i < 40; i++) { try { const r = await fetch(base + '/'); if (r.status) return { child, base } } catch {} await new Promise(r => setTimeout(r, 250)) }
  console.error('启动失败', log.join('')); child.kill(); throw new Error('serve start failed')
}

let fails = 0
const assert = (cond, msg, extra) => { if (!cond) { fails++; console.error('断言失败:', msg, extra !== undefined ? extra : '') } else console.log('ok ', msg) }
const J = async r => { try { return JSON.parse(await r.text()) } catch { return null } }

const s1 = await start(archA, 8935)
try {
  const b = s1.base
  const get = async p => { const r = await fetch(b + p); return { status: r.status, j: await J(r) } }

  let r = await get('/api/books')
  assert(r.j?.v === 'list-after-create', '1 GET /api/books 策略 latest → 首次即最新版本', JSON.stringify(r.j))
  r = await get('/api/books')
  assert(r.j?.v === 'list-after-create', '2 GET latest 重复请求仍为最新（不递减）', JSON.stringify(r.j))

  r = await get('/api/books/b1/world')
  assert(r.j?.status === 'ready', '3 :id 通配规则命中 → world 取 ready 而非 building', JSON.stringify(r.j))

  const seq = []
  for (let i = 0; i < 3; i++) { const x = await get('/api/engine-tasks/t1/events'); seq.push(x.j?.s) }
  assert(JSON.stringify(seq) === '["queued","running","completed"]', '4 未声明策略的 GET events 保持 FIFO（queued→running→completed）', JSON.stringify(seq))

  const post = async () => { const x = await fetch(b + '/api/session', { method: 'POST', body: '{}' }); return (await J(x))?.n }
  const n1 = await post(), n2 = await post(), n3 = await post()
  assert(n1 === 1 && n2 === 2 && n3 === 2, '5 POST 保持 FIFO 多版本后钳位（默认策略不波及写请求）', JSON.stringify([n1, n2, n3]))

  const bad = await fetch(b + '/api/session', { method: 'POST', body: '{"x":1}' })
  assert(bad.status === 599, '6 body 不匹配仍 599（策略不绕过指纹匹配）', bad.status)

  const amb = await get('/api/list?page=3')
  assert(amb.status === 599, '7 多 query 候选仍拒绝猜测', amb.status)
} finally { s1.child.kill() }

const s2 = await start(archB, 8936)
try {
  const get = async p => { const r = await fetch(s2.base + p); return { status: r.status, j: await J(r) } }
  const a = await get('/api/books'), bq = await get('/api/books')
  assert(a.j?.v === 'old' && bq.j?.v === 'new', '8 无 replay-policies.json 的旧归档保持纯 FIFO（向后兼容）', JSON.stringify([a.j, bq.j]))
} finally { s2.child.kill() }

console.log('replay-policy smoke done, fails =', fails)
process.exitCode = fails ? 1 : 0
