// 冒烟检查：capture-steps 三缺陷修复 + 同签名多响应 FIFO + 跨运行去重 + api-coverage-audit
// 断言:
//   1 同 URL 不同请求体的 POST 各自成条（key 含请求体指纹），reqBody 入库，响应内容对应各自请求
//   2 同签名（同 URL 同 body）不同响应全保留为同 key 多条目（FIFO）；相同响应体去重（重复点击不重复入库）
//   3 跨运行去重：第二次采集相同响应不入库，新响应追加为新版本
//   4 超 12MB 响应不静默丢，capture-failures.jsonl 有 response-body-too-large
//   5 回放侧 FIFO 消费顺序正确，响应内容可核对
import { spawnSync, spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, readFileSync, copyFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..', '..')
const script = join(ROOT, 'workspace', 'bishuxiezuo', 'capture-steps.mjs')
const audit = join(ROOT, '.claude', 'skills', 'uiforge-site-clone', 'scripts', 'api-coverage-audit.mjs')
const serveSrc = join(ROOT, '.claude', 'skills', 'uiforge-site-clone', 'scripts', 'replay-serve-v2.mjs')
const tmp = join(import.meta.dirname, 'tmp')
rmSync(tmp, { recursive: true, force: true })
mkdirSync(join(tmp, 'archive'), { recursive: true })
writeFileSync(join(tmp, 'archive', 'index.json'), JSON.stringify({ origin: 'http://127.0.0.1:8931', startNorm: '/', startUrl: 'http://127.0.0.1:8931/', count: 0, entries: [] }))

const server = spawn(process.execPath, [join(import.meta.dirname, 'server.mjs')], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 800))

const ARGS = ['--out', join(tmp, 'archive'), '--url', 'http://127.0.0.1:8931/', '--step', '#goA', '--step', '#goB', '--step', '#goS1', '--step', '#goS2', '--step', '#goA', '--wait', '800']
let fails = 0
const assert = (cond, msg, extra) => { if (!cond) { fails++; console.error('断言失败:', msg, extra !== undefined ? extra : '') } else console.log('ok ', msg) }
const idx = () => JSON.parse(readFileSync(join(tmp, 'archive', 'index.json'), 'utf8'))
const fileBody = e => JSON.parse(readFileSync(join(tmp, 'archive', 'files', e.file), 'utf8'))

try {
  const run1 = spawnSync(process.execPath, [script, ...ARGS], { cwd: ROOT, encoding: 'utf8', timeout: 120000 })
  if (run1.status !== 0) { console.error('第一次采集失败:', run1.stderr); process.exit(1) }
  let ix = idx()
  const echoes = ix.entries.filter(e => e.url.includes('/api/echo'))
  assert(echoes.length === 2, '同 URL 不同请求体保留 2 条变体', echoes.length)
  assert(new Set(echoes.map(e => e.key)).size === 2, '两条变体 key 不同（含指纹）')
  const gotA = fileBody(echoes.find(e => e.reqBody.includes('"k":"A"')))
  assert(gotA.got === '{"k":"A"}', 'A 变体响应内容正确', JSON.stringify(gotA))
  const sessions1 = ix.entries.filter(e => e.url.includes('/api/session'))
  assert(sessions1.length === 2 && new Set(sessions1.map(e => e.key)).size === 1, '同签名不同响应保留 2 版本同 key', sessions1.length)
  assert(fileBody(sessions1[0]).n === 1 && fileBody(sessions1[1]).n === 2, 'FIFO 版本按录制顺序排列', JSON.stringify(sessions1.map(s => fileBody(s))))
  const fails1 = readFileSync(join(tmp, 'archive', 'capture-failures.jsonl'), 'utf8')
  assert(fails1.includes('response-body-too-large') && fails1.includes('/api/big'), '超限响应落盘 failures')

  // 第二次采集: echo 响应相同应跨运行去重；session 是新响应（n:3 n:4）应追加版本
  const run2 = spawnSync(process.execPath, [script, ...ARGS], { cwd: ROOT, encoding: 'utf8', timeout: 120000 })
  if (run2.status !== 0) { console.error('第二次采集失败:', run2.stderr); process.exit(1) }
  ix = idx()
  assert(ix.entries.filter(e => e.url.includes('/api/echo')).length === 2, '跨运行相同响应去重', ix.entries.filter(e => e.url.includes('/api/echo')).length)
  const sessions2 = ix.entries.filter(e => e.url.includes('/api/session'))
  assert(sessions2.length === 4, '跨运行新响应追加为版本 3/4', sessions2.length)

  // 回放侧 FIFO + 内容校验
  copyFileSync(serveSrc, join(tmp, 'archive', 'serve.mjs'))
  const port = 8792
  const serve = spawn(process.execPath, [join(tmp, 'archive', 'serve.mjs')], { cwd: join(tmp, 'archive'), env: { ...process.env, PORT: String(port) }, stdio: 'ignore' })
  await new Promise(r => setTimeout(r, 1200))
  const post = async b => { const r = await fetch('http://127.0.0.1:' + port + '/api/session', { method: 'POST', body: b }); return { s: r.status, j: await r.json() } }
  let r = await post('{}')
  assert(r.s === 200 && r.j.n === 1, '回放 FIFO 第1次 → n:1', JSON.stringify(r))
  r = await post('{}'); assert(r.j.n === 2, '回放 FIFO 第2次 → n:2', JSON.stringify(r))
  r = await post('{}'); assert(r.j.n === 3, '回放 FIFO 第3次 → n:3', JSON.stringify(r))
  r = await post('{}'); assert(r.j.n === 4, '回放 FIFO 第4次 → n:4', JSON.stringify(r))
  r = await post('{}'); assert(r.j.n === 4, '回放 FIFO 停在最后一版', JSON.stringify(r))
  serve.kill()

  const a = spawnSync(process.execPath, [audit, '--archive', join(tmp, 'archive'), '--out', join(tmp, 'report.md')], { cwd: ROOT, encoding: 'utf8', timeout: 30000 })
  assert(a.status === 0, 'audit 正常退出')
  const report = readFileSync(join(tmp, 'report.md'), 'utf8')
  assert(report.includes('同签名多响应版本') && report.includes('版本数'), '报告含多版本签名章节')
  assert(!report.includes('POST 缺请求体记录。\n\n无'), '新格式 POST 不应被标记缺请求体')
} finally {
  server.kill()
}
console.log('capture smoke done, fails =', fails)
process.exitCode = fails ? 1 : 0
