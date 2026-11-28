// 步骤抓取：按给定选择器序列点击，边点边录响应，合并进已有归档
//
// 用法（workspace/<站点>/ 下，需 NODE_PATH 指向 common）:
//   node capture-steps.mjs --out ./archive-x --state ./auth.json \
//     --url https://site/console/console.html \
//     --step ".bc-open" --step '[title="世界"]' --step "重新编辑世界观" --step "进入编辑"
//
// --step 值以 . [ # 开头按 CSS 选择器处理，否则按按钮文本匹配（trim 相等优先，其次包含）。
// 合并规则：同 key（METHOD + 归一化 URL）以新录的为准；文件写到 _steps/ 下避免覆盖既有镜像文件。
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

const req = createRequire(new URL('../common/package.json', import.meta.url).href)
const pw = await import(pathToFileURL(req.resolve('playwright')).href)
const chromium = pw.chromium ?? pw.default.chromium

const argv = process.argv.slice(2)
const val = n => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null }
const vals = n => argv.reduce((a, x, i) => (x === n && argv[i + 1] ? [...a, argv[i + 1]] : a), [])
const outDir = (val('--out') || './archive').replace(/^\.\//, '')
const statePath = val('--state') || './auth.json'
const url = val('--url')
const steps = vals('--step')
const stepWait = Number(val('--wait') || 3000)
if (!url || !steps.length) { console.error('需要 --url 和至少一个 --step'); process.exit(1) }
if (!existsSync(join(outDir, 'index.json'))) { console.error('目标归档不存在:', outDir); process.exit(1) }

const MAX_BODY = 12 * 1024 * 1024
const norm = u => { try { const x = new URL(u); for (const p of ['_rsc', '__nextDataReq', '_', 'cb', 'ts', 'timestamp']) x.searchParams.delete(p); return x.origin + x.pathname + (x.search || '') } catch { return u } }
const extFromCt = ct => {
  ct = (ct || '').toLowerCase()
  if (ct.includes('html')) return '.html'
  if (ct.includes('javascript') || ct.includes('ecmascript')) return '.js'
  if (ct.includes('json') || ct.includes('x-component')) return '.json'
  if (ct.includes('css')) return '.css'
  if (ct.includes('svg')) return '.svg'
  if (ct.includes('png')) return '.png'
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg'
  if (ct.includes('webp')) return '.webp'
  if (ct.includes('woff2')) return '.woff2'
  if (ct.includes('font') || ct.includes('woff')) return '.woff'
  if (ct.includes('text/plain')) return '.txt'
  return '.bin'
}
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36) }

const idx = JSON.parse(readFileSync(join(outDir, 'index.json'), 'utf8'))
const byKey = new Map(idx.entries.map(e => [e.key, e]))

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : undefined })
const page = await context.newPage()

const rec = new Map()
page.on('response', async r => {
  try {
    const req_ = r.request(); const m = req_.method(); const u = r.url()
    if (/^data:|^blob:/.test(u)) return
    const body = await r.body().catch(() => null)
    if (!body || body.length > MAX_BODY) return
    const h = r.headers(); const headers = {}
    for (const k of Object.keys(h)) { const lk = k.toLowerCase(); if (['content-encoding', 'content-length', 'transfer-encoding', 'set-cookie', 'strict-transport-security', 'content-security-policy'].includes(lk)) continue; headers[lk] = h[k] }
    rec.set(m + ' ' + norm(u), { method: m, url: u, status: r.status(), headers, body })
  } catch {}
})

console.log('打开', url)
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

for (const step of steps) {
  const isSel = /^[.#\[]/.test(step)
  let done = false
  if (isSel) {
    try { await page.click(step, { force: true, timeout: 15000 }); done = true } catch {}
  }
  if (!done) {
    done = await page.evaluate(text => {
      const btns = [...document.querySelectorAll('button, [role=button], a, span')]
      const t = btns.find(b => (b.textContent || '').trim() === text) || btns.find(b => (b.textContent || '').includes(text))
      if (!t) return false
      t.click(); return true
    }, step)
  }
  console.log(`  ${done ? 'ok  ' : 'MISS'} ${step}`)
  await page.waitForTimeout(stepWait)
}

// 顺带滚动一遍，触发懒加载
await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.9) { window.scrollTo(0, y); await sleep(120) }
  window.scrollTo(0, 0)
})
await page.waitForTimeout(1500)
const finalView = await page.evaluate(() => document.querySelector('.runtime-admission-content')?.firstElementChild?.className || null)
const crwbe = await page.evaluate(() => document.querySelectorAll('[class*="cr-wbe"]').length)
await browser.close()

let added = 0
for (const [key, r] of rec) {
  const ct = r.headers['content-type'] || ''
  const ext = extFromCt(ct)
  let path = ''
  try { path = new URL(r.url).pathname } catch { path = '/' + hash(r.url) }
  const safe = path.replace(/^\//, '').replace(/[^\w./-]/g, '_') || 'index'
  const file = sanitizeJoin('_steps', safe + (safe.endsWith(ext) ? '' : '.' + hash(key) + ext))
  const abs = join(outDir, 'files', file)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, r.body)
  const entry = { key, method: r.method, url: r.url, status: r.status, headers: r.headers, file, ct }
  const prev = byKey.get(key)
  if (!prev || prev.status !== r.status) added++
  byKey.set(key, entry)
}

function sanitizeJoin(...parts) { return parts.join('/').replace(/\/+/g, '/') }

const entries = [...byKey.values()]
writeFileSync(join(outDir, 'index.json'), JSON.stringify({ ...idx, count: entries.length, entries }, null, 0))
console.log(`录制 ${rec.size} 条，归档更新为 ${entries.length} 条（新增/变更 ${added}）`)
console.log('最终视图:', finalView, '| cr-wbe:', crwbe)
