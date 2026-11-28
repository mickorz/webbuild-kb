// Batch 8.2 冒烟：JSON 事件游标语义
// 覆盖:
//   1 after_id=0 → 完整事件列表
//   2 after_id=中间 id → 仅后续事件
//   3 after_id=maxId → 空数组
//   4 after_id 超范围 → 空数组
//   5 基础数据必须取「事件最全」的录制，而不是被游标截断过的历史响应（关键）
//   6 非游标端点不受影响（普通数组原样返回）
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, readFileSync, rmSync, copyFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..', '..')
const serveSrc = join(ROOT, '.claude', 'skills', 'uiforge-site-clone', 'scripts', 'replay-serve-v2.mjs')
const tmp = join(import.meta.dirname, '.run')
rmSync(tmp, { recursive: true, force: true })
mkdirSync(join(tmp, 'files'), { recursive: true })

const origin = 'http://127.0.0.1:8813'
const entries = []
const put = (pathAndQuery, body, keyExtra = '') => {
  const file = 'f' + entries.length + '.json'
  writeFileSync(join(tmp, 'files', file), JSON.stringify(body))
  entries.push({
    key: 'GET ' + origin + pathAndQuery + keyExtra,
    method: 'GET', url: origin + pathAndQuery, status: 200,
    headers: { 'content-type': 'application/json' }, file, ct: 'application/json'
  })
}
const full = [1, 2, 3, 4, 5, 6].map(id => ({ id, event_type: 'ev' + id }))
// 先录完整集，再录一份「已被游标截断」的历史响应（只有 5、6）——服务必须挑完整的那份
put('/api/events?after_id=0', full)
put('/api/events?after_id=4', full.filter(e => e.id > 4))
// 非游标端点（普通数组）对照组
put('/api/plain', [{ id: 1 }, { id: 2 }])
writeFileSync(join(tmp, 'index.json'), JSON.stringify({ origin, startNorm: '/', startUrl: '/', count: entries.length, entries }))
writeFileSync(join(tmp, 'replay-policies.json'), JSON.stringify({
  default: 'fifo',
  rules: [{ method: 'GET', path: '/api/events', mode: 'latest', ignoreQuery: true, cursor: { param: 'after_id', field: 'id' } }]
}))
copyFileSync(serveSrc, join(tmp, 'serve.mjs'))

const port = 8813
const srv = spawn(process.execPath, [join(tmp, 'serve.mjs')], { cwd: tmp, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' })
const base = 'http://127.0.0.1:' + port
let up = false
for (let i = 0; i < 50; i++) { try { const r = await fetch(base + '/'); if (r.status) { up = true; break } } catch {} await new Promise(r => setTimeout(r, 200)) }
if (!up) { console.error('serve 启动失败'); process.exit(1) }

let fails = 0
const assert = (cond, msg, extra) => { if (!cond) { fails++; console.error('断言失败:', msg, extra !== undefined ? extra : '') } else console.log('ok ', msg) }
const getIds = async (q) => {
  const r = await fetch(base + '/api/events' + q)
  const j = await r.json()
  return { status: r.status, ids: Array.isArray(j) ? j.map(e => e.id) : null }
}

try {
  let r = await getIds('?after_id=0')
  assert(JSON.stringify(r.ids) === '[1,2,3,4,5,6]', 'after_id=0 → 完整 6 条事件', JSON.stringify(r.ids))
  r = await getIds('?after_id=3')
  assert(JSON.stringify(r.ids) === '[4,5,6]', 'after_id=3 → 仅后续 3 条', JSON.stringify(r.ids))
  r = await getIds('?after_id=6')
  assert(Array.isArray(r.ids) && r.ids.length === 0, 'after_id=maxId → 空数组', JSON.stringify(r.ids))
  r = await getIds('?after_id=999')
  assert(Array.isArray(r.ids) && r.ids.length === 0, 'after_id 超范围 → 空数组', JSON.stringify(r.ids))
  r = await getIds('?after_id=0')
  assert(r.ids.length === 6, '基础数据取最全集（未被 after_id=4 的历史截断样本污染）', r.ids.length)
  const plain = await (await fetch(base + '/api/plain')).json()
  assert(JSON.stringify(plain) === '[{"id":1},{"id":2}]', '非游标端点数组原样返回', JSON.stringify(plain))
} finally { srv.kill() }

console.log('json-cursor smoke done, fails =', fails)
process.exitCode = fails ? 1 : 0
