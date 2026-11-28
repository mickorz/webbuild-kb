// 步骤抓取：按给定选择器序列点击，边点边录响应，合并进已有归档
//
// 用法（workspace/<站点>/ 下，需 NODE_PATH 指向 common）:
//   node capture-steps.mjs --out ./archive-x --state ./auth.json \
//     --url https://site/console/console.html \
//     --step ".bc-open" --step '[title="世界"]' --step "重新编辑世界观" --step "进入编辑"
//
// --step 值以 . [ # 开头按 CSS 选择器处理，否则按按钮文本匹配（trim 相等优先，其次包含）。
// 输入步骤：--step "fill:.search=关键词" 只填充不回车；--step "fillenter:.search=关键词" 填充后回车（搜索类操作）
// 交互补采：加 --interactive 用有头浏览器人工操作目标功能，回终端按 Enter 结束录制（此时无需 --step）。
// 合并规则：同 key（METHOD + 归一化URL + 请求体指纹）的多响应全保留（回放按 FIFO 消费），相同响应体去重；
// 文件按响应内容哈希写入 _steps/，多版本不互相覆盖。
// 同 URL 不同请求体对应不同页面状态，key 里带完整请求体 sha256 前 12 位区分。
// 采集失败/丢弃（响应体不可读、超 12MB、handler 异常）写入 <归档>/capture-failures.jsonl，不再静默丢。
// 归档条目新增 reqBody 字段（POST 请求体原文）：>1MB 只存前 4KB 并标 reqBodyTruncated，指纹仍按完整体计算。
// norm 对 query 参数排序：参数顺序不同视为同一签名。
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createInterface } from 'node:readline'
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
const interactive = argv.includes('--interactive')
if (!url || (!steps.length && !interactive)) { console.error('需要 --url，以及至少一个 --step 或 --interactive'); process.exit(1) }
if (interactive && !process.stdin.isTTY) { console.error('--interactive 需要在终端里人工操作，stdin 不是 TTY'); process.exit(1) }
if (!existsSync(join(outDir, 'index.json'))) { console.error('目标归档不存在:', outDir); process.exit(1) }

const MAX_BODY = 12 * 1024 * 1024
const MAX_REQ_BODY = 1024 * 1024   // reqBody 入库上限，超出截断存储（指纹仍按完整请求体计算）
const norm = u => { try { const x = new URL(u); for (const p of ['_rsc', '__nextDataReq', '_', 'cb', 'ts', 'timestamp']) x.searchParams.delete(p); const sp = [...x.searchParams.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0); x.search = ''; for (const [k, v] of sp) x.searchParams.append(k, v); return x.origin + x.pathname + (x.search || '') } catch { return u } }
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

const browser = await chromium.launch({ headless: !interactive })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : undefined })
const page = await context.newPage()

const rec = new Map()   // 签名 key → 响应数组（同签名多响应 FIFO，相同响应体合并时去重）
const failuresPath = join(outDir, 'capture-failures.jsonl')
const fail = o => { try { appendFileSync(failuresPath, JSON.stringify({ ts: new Date().toISOString(), ...o }) + '\n') } catch {} }
page.on('response', async r => {
  let m = '?', u = '?'
  try {
    const req_ = r.request(); m = req_.method(); u = r.url()
    if (/^data:|^blob:/.test(u)) return
    const rawReq = req_.postData() || null
    let reqBody = null, reqBodyTruncated = false
    if (rawReq) { reqBodyTruncated = rawReq.length > MAX_REQ_BODY; reqBody = reqBodyTruncated ? rawReq.slice(0, 4096) : rawReq }
    const body = await r.body().catch(() => null)
    if (!body) { fail({ kind: 'response-body-unreadable', method: m, url: u, status: r.status() }); return }
    if (body.length > MAX_BODY) { fail({ kind: 'response-body-too-large', method: m, url: u, status: r.status(), size: body.length }); return }
    const h = r.headers(); const headers = {}
    for (const k of Object.keys(h)) { const lk = k.toLowerCase(); if (['content-encoding', 'content-length', 'transfer-encoding', 'set-cookie', 'strict-transport-security', 'content-security-policy'].includes(lk)) continue; headers[lk] = h[k] }
    const bh = rawReq ? '#' + createHash('sha256').update(rawReq).digest('hex').slice(0, 12) : ''
    const key = m + ' ' + norm(u) + bh
    const list = rec.get(key) || []
    if (!list.length || !list[list.length - 1].body.equals(body)) list.push({ method: m, url: u, status: r.status(), headers, body, reqBody, reqBodyTruncated })
    rec.set(key, list)
  } catch (e) { fail({ kind: 'handler-error', method: m, url: u, error: String(e).slice(0, 200) }) }
})

console.log('打开', url)
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

if (interactive) {
  console.log('交互模式：在浏览器里手动操作目标功能，完成后回到终端按 Enter 结束录制')
  await new Promise(res => { const rl = createInterface({ input: process.stdin, output: process.stdout }); rl.question('', () => { rl.close(); res() }) })
}
else for (const step of steps) {
  if (step.startsWith('fill:') || step.startsWith('fillenter:')) {
    const spec = step.slice(step.indexOf(':') + 1)
    const i = spec.lastIndexOf('=')   // 属性选择器内含 =（如 input[type=search]），按最后一个 = 拆分
    const sel = spec.slice(0, i), val = spec.slice(i + 1)
    let ok = false, err = ''
    try { await page.fill(sel, val, { timeout: 15000 }); if (step.startsWith('fillenter:')) await page.press(sel, 'Enter'); ok = true } catch (e) { err = String(e).slice(0, 160) }
    console.log(`  ${ok ? 'ok  ' : 'MISS'} ${step}${err ? ' | ' + err : ''}`)
    await page.waitForTimeout(stepWait)
    continue
  }
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
const finalUrl = page.url()
const finalTitle = await page.title()
await browser.close()

let added = 0
const outEntries = [...idx.entries]
const keyExists = new Set(idx.entries.map(e => e.key))
// 同签名相同响应体跨运行去重: key → Set(响应体 sha256)
const seenResp = new Map()
const sha = b => createHash('sha256').update(b).digest('hex')
for (const e of idx.entries) {
  let s = seenResp.get(e.key)
  if (!s) { s = new Set(); seenResp.set(e.key, s) }
  try { s.add(sha(readFileSync(join(outDir, 'files', e.file)))) } catch {}
}
for (const [key, list] of rec) {
  for (let i = 0; i < list.length; i++) {
    const r = list[i]
    const ct = r.headers['content-type'] || ''
    // 已有同名 HTML 文档条目时跳过：镜像里的入口 HTML 可能已被人工定制（登录种子 / 样式版本号），
    // 不能用抓到的原始副本覆盖它
    if (ct.includes('html') && keyExists.has(key)) continue
    const rbh = sha(r.body)
    const seen = seenResp.get(key) || new Set()
    if (seen.has(rbh)) continue   // 同签名同响应已归档（含跨运行），跳过
    seen.add(rbh); seenResp.set(key, seen)
    const ext = extFromCt(ct)
    let path = ''
    try { path = new URL(r.url).pathname } catch { path = '/' + hash(r.url) }
    const safe = path.replace(/^\//, '').replace(/[^\w./-]/g, '_') || 'index'
    const file = sanitizeJoin('_steps', safe + (safe.endsWith(ext) ? '' : '.' + rbh.slice(0, 12) + ext))   // 按响应内容命名，多版本不互相覆盖
    const abs = join(outDir, 'files', file)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, r.body)
    const entry = { key, method: r.method, url: r.url, status: r.status, headers: r.headers, file, ct }
    if (r.reqBody) entry.reqBody = r.reqBody
    if (r.reqBodyTruncated) entry.reqBodyTruncated = true
    outEntries.push(entry)
    added++
  }
}

function sanitizeJoin(...parts) { return parts.join('/').replace(/\/+/g, '/') }

const entries = outEntries
writeFileSync(join(outDir, 'index.json'), JSON.stringify({ ...idx, count: entries.length, entries }, null, 0))
const recorded = [...rec.values()].reduce((a, l) => a + l.length, 0)
console.log(`录制 ${recorded} 条响应（同签名多版本 FIFO 保留，相同响应去重），归档更新为 ${entries.length} 条（新增 ${added}）`)
if (existsSync(failuresPath)) console.log('采集失败/丢弃记录:', failuresPath)
console.log('最终页面:', finalUrl, '|', finalTitle)
