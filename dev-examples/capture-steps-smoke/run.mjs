// 冒烟检查：capture-steps 三缺陷修复 + api-coverage-audit
// 断言:
//   1 同 URL 两个不同请求体的 POST 各自成条（key 含请求体指纹），reqBody 入库
//   2 超 12MB 响应不静默丢，capture-failures.jsonl 有 response-body-too-large
//   3 api-coverage-audit 能跑通并把上述信号报出来
import { spawnSync, spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..', '..')
const script = join(ROOT, 'workspace', 'bishuxiezuo', 'capture-steps.mjs')
const audit = join(ROOT, '.claude', 'skills', 'uiforge-site-clone', 'scripts', 'api-coverage-audit.mjs')
const tmp = join(import.meta.dirname, 'tmp')
rmSync(tmp, { recursive: true, force: true })
mkdirSync(join(tmp, 'archive'), { recursive: true })
writeFileSync(join(tmp, 'archive', 'index.json'), JSON.stringify({ origin: 'http://127.0.0.1:8931', startNorm: '/', startUrl: 'http://127.0.0.1:8931/', count: 0, entries: [] }))

const server = spawn(process.execPath, [join(import.meta.dirname, 'server.mjs')], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 800))

try {
  const run = spawnSync(process.execPath, [script, '--out', join(tmp, 'archive'), '--url', 'http://127.0.0.1:8931/', '--step', '#goA', '--step', '#goB', '--wait', '800'], { cwd: ROOT, encoding: 'utf8', timeout: 90000 })
  console.log(run.stdout, run.stderr)

  const idx = JSON.parse(readFileSync(join(tmp, 'archive', 'index.json'), 'utf8'))
  const echoes = idx.entries.filter(e => e.url.includes('/api/echo'))
  const assert = (cond, msg) => { if (!cond) { console.error('断言失败:', msg); process.exitCode = 1 } }
  assert(echoes.length === 2, `同 URL 不同请求体应保留 2 条变体，实际 ${echoes.length}`)
  assert(new Set(echoes.map(e => e.key)).size === 2, '两条变体的 key 应不同（含请求体指纹）')
  assert(echoes.every(e => e.reqBody && /"k":"(A|B)"/.test(e.reqBody)), 'reqBody 应入库且对应各自请求')

  const fails = existsSync(join(tmp, 'archive', 'capture-failures.jsonl')) ? readFileSync(join(tmp, 'archive', 'capture-failures.jsonl'), 'utf8') : ''
  assert(fails.includes('response-body-too-large') && fails.includes('/api/big'), '超限响应应记录进 capture-failures.jsonl')

  const a = spawnSync(process.execPath, [audit, '--archive', join(tmp, 'archive'), '--out', join(tmp, 'report.md')], { cwd: ROOT, encoding: 'utf8', timeout: 30000 })
  assert(a.status === 0, 'audit 应正常退出')
  const report = readFileSync(join(tmp, 'report.md'), 'utf8')
  assert(report.includes('变体冲突'), '报告应包含变体冲突章节')
  assert(!report.includes('POST 缺请求体记录。\n\n无'), '新格式 POST 不应被标记缺请求体')
  console.log('smoke done, exitCode =', process.exitCode ?? 0)
} finally {
  server.kill()
}
