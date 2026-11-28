// Batch 8.3（限时定位）：E02「回放选中全球高武而非 WBTEST-E02」
// 实验 A：页面加载前注入 lf_selected_book = WBTEST-E02，看是否被改回
// 实验 B：包装 localStorage.setItem，记录 lf_selected_book 的写入时间线（旧值/新值/来源栈）
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { cpSync, rmSync, readFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = resolve(import.meta.dirname, '..', '..')
const BOOK = 'a9379563-e534-4ed3-8996-78b31b1d1bb0'
const OTHER = '2de6cf8f-9b82-4edd-92d1-e0b6611546ec'
const archive = join(ROOT, 'workspace', 'bishuxiezuo', 'archive-bishu')
const serveSrc = join(ROOT, '.claude', 'skills', 'uiforge-site-clone', 'scripts', 'replay-serve-v2.mjs')
const req = createRequire(new URL('../../workspace/common/package.json', import.meta.url).href)
const pw = await import(pathToFileURL(req.resolve('playwright')).href)
const chromium = pw.chromium ?? (pw.default && pw.default.chromium)

const runDir = join(import.meta.dirname, '.run')
rmSync(runDir, { recursive: true, force: true })
const arch = join(runDir, 'archive')
cpSync(archive, arch, { recursive: true })
cpSync(serveSrc, join(arch, 'serve.mjs'))
const port = 8817
const srv = spawn(process.execPath, [join(arch, 'serve.mjs')], { cwd: arch, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' })
const base = 'http://127.0.0.1:' + port
for (let i = 0; i < 50; i++) { try { const r = await fetch(base + '/'); if (r.status) break } catch {} await new Promise(r => setTimeout(r, 200)) }

const monitor = `(() => {
  const orig = localStorage.setItem.bind(localStorage)
  window.__lsLog = []
  localStorage.setItem = function (k, v) {
    const old = localStorage.getItem(k)
    if (k === 'lf_selected_book' || k.startsWith('lf_wb_')) {
      window.__lsLog.push({ t: Math.round(performance.now()), k, old: old && old.slice(0, 8), neu: String(v).slice(0, 8), stack: (new Error()).stack.split('\\n').slice(2, 5).join(' | ').slice(0, 220) })
    }
    return orig(k, v)
  }
})();`

const browser = await chromium.launch()
const out = {}

// 实验 A: 注入目标书籍 id 后加载
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(`try { localStorage.setItem('lf_selected_book', '${BOOK}') } catch (e) {}`)
  await ctx.addInitScript(monitor)
  const page = await ctx.newPage()
  const apiBooks = []
  page.on('response', r => {
    const u = new URL(r.url())
    if (u.pathname === '/api/books') apiBooks.push('books')
    if (u.pathname.startsWith('/api/books/') && u.pathname.includes('/world')) apiBooks.push('world:' + u.pathname.split('/')[3].slice(0, 8))
  })
  await page.goto(base + '/console/console.html', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(9000)
  out.A = await page.evaluate(() => ({
    selected: localStorage.getItem('lf_selected_book'),
    crWbe: document.querySelectorAll('[class*="cr-wbe"]').length,
    crShell: document.querySelectorAll('.cr-shell').length,
    log: window.__lsLog || []
  }))
  out.A.api = apiBooks
  await ctx.close()
}

// 实验 B: 不注入，观察自然加载后的选中与写入链
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(monitor)
  const page = await ctx.newPage()
  await page.goto(base + '/console/console.html', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(9000)
  out.B = await page.evaluate(() => ({
    selected: localStorage.getItem('lf_selected_book'),
    crWbe: document.querySelectorAll('[class*="cr-wbe"]').length,
    log: (window.__lsLog || []).filter(x => x.k === 'lf_selected_book')
  }))
  await ctx.close()
}

srv.kill()
await browser.close()

console.log('=== 实验 A（加载前注入 WBTEST-E02 = a9379563）===')
console.log('最终 lf_selected_book:', out.A.selected, '| 期望仍是 a9379563')
console.log('被改回全球高武:', out.A.selected === OTHER)
console.log('cr-wbe 区块:', out.A.crWbe, '| cr-shell:', out.A.crShell)
console.log('API:', out.A.api.slice(0, 6).join(' | '))
console.log('lf_selected_book 写入记录:')
for (const l of out.A.log.filter(x => x.k === 'lf_selected_book')) console.log('  +' + l.t + 'ms', l.old, '→', l.neu, '|', l.stack)
console.log('\n=== 实验 B（不注入）===')
console.log('最终 lf_selected_book:', out.B.selected, '| cr-wbe:', out.B.crWbe)
console.log('写入记录:', JSON.stringify(out.B.log.map(l => ({ t: l.t, neu: l.neu }))))
console.log('\n结论线索:')
if (out.A.selected === OTHER) console.log('  → 注入被覆盖：问题在启动时的书籍状态恢复（非点击链路）')
else console.log('  → 注入保持：问题在点击事件与选中状态更新链路')
rmSync(runDir, { recursive: true, force: true })
