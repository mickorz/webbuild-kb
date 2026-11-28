// E02 差异报告：线上 vs 离线回放 的 DOM/业务状态/API 时间线对比
// 目的：定位「线上 4 个 .cr-wbe 区块、回放 0 个」的根因（哪个 API 决定向导步骤与区块渲染）
// 用法（仓库根目录）: node dev-examples/e02-diff/report.mjs
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = resolve(import.meta.dirname, '..', '..')
const BOOK = 'a9379563-e534-4ed3-8996-78b31b1d1bb0'
const authFile = join(ROOT, 'workspace', 'bishuxiezuo', 'auth.json')
const archive = join(ROOT, 'workspace', 'bishuxiezuo', 'archive-bishu')
const serveSrc = join(ROOT, '.claude', 'skills', 'uiforge-site-clone', 'scripts', 'replay-serve-v2.mjs')
const req = createRequire(new URL('../../workspace/common/package.json', import.meta.url).href)
const pw = await import(pathToFileURL(req.resolve('playwright')).href)
const chromium = pw.chromium ?? (pw.default && pw.default.chromium)
const sleep = ms => new Promise(r => setTimeout(r, ms))

// 进书并采样（同一套动作，线上/回放各跑一次）
const probe = async (page, label) => {
  const apis = []
  page.on('response', r => {
    const u = new URL(r.url())
    if (u.pathname.startsWith('/api/') && (u.pathname.includes(BOOK) || u.pathname.includes('engine') || u.pathname.includes('world') || u.pathname.includes('character') || u.pathname.includes('story'))) {
      apis.push(r.request().method() + ' ' + r.status() + ' ' + u.pathname.replace(BOOK, '<B>') + (u.search ? '?' + u.searchParams.toString().slice(0, 30) : ''))
    }
  })
  await page.waitForTimeout(3000)
  // 进书：按卡片文本定位（容器内仅 1 个 .bc-open）
  const pos = await page.evaluate(t => {
    for (const b of document.querySelectorAll('.bc-open')) {
      let el = b
      for (let i = 0; i < 8 && el; i++) {
        el = el.parentElement
        if (el && (el.textContent || '').includes(t) && el.querySelectorAll('.bc-open').length === 1) {
          const btn = el.querySelector('.bc-open')
          const br = btn ? btn.getBoundingClientRect() : null
          const r = (br && br.width > 2 && br.height > 2) ? br : el.getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        }
      }
    }
    return null
  }, 'WBTEST-E02')
  const diag = await page.evaluate(() => ({ opens: document.querySelectorAll('.bc-open').length, titles: [...document.querySelectorAll('.bc-open')].map(b => { let el=b; for(let i=0;i<6&&el;i++){el=el.parentElement; if(el&&el.querySelectorAll('.bc-open').length===1) return (el.textContent||'').trim().slice(0,20)} return '?' }), lsBook: localStorage.getItem('lf_selected_book') }))
  if (pos) { await page.mouse.move(pos.x, pos.y); await page.waitForTimeout(900); await page.mouse.click(pos.x, pos.y) }
  await page.waitForTimeout(9000)
  const dom = await page.evaluate(() => ({
    crShell: document.querySelectorAll('.cr-shell').length,
    crWbe: document.querySelectorAll('[class*="cr-wbe"]').length,
    crStepCurrent: [...document.querySelectorAll('[class*="cr-step"]')].filter(e => /on|active|current/.test(String(e.className))).map(e => (e.textContent || '').trim().slice(0, 12)),
    steps: [...document.querySelectorAll('[class*="cr-step"]')].map(e => (e.textContent || '').trim().slice(0, 10)).filter(Boolean).slice(0, 8),
    foundryText: (document.body.innerText.match(/铸造一个世界[\s\S]{0,80}/) || [''])[0].replace(/\n/g, ' ').slice(0, 100),
    blockTitles: [...document.querySelectorAll('[class*="cr-wbe"]')].map(e => (e.textContent || '').trim().slice(0, 20))
  }))
  const enteredBook = (apis.find(a => a.includes('/world')) || '').match(/books\/([0-9a-f-]+)/)?.[1] || null
  return { label, dom, apis, diag, pos, enteredBook }
}

const results = []
const browser = await chromium.launch()

// 线上
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: JSON.parse(readFileSync(authFile, 'utf8')) })
  const page = await ctx.newPage()
  await page.goto('https://bishuxiezuo.cn/console/console.html', { waitUntil: 'domcontentloaded' })
  results.push(await probe(page, 'live'))
  await ctx.close()
}

// 回放（临时副本 + 最新 serve）
const tmp = join(import.meta.dirname, 'tmp')
rmSync(tmp, { recursive: true, force: true })
cpSync(archive, tmp, { recursive: true })
cpSync(serveSrc, join(tmp, 'serve.mjs'))
const port = 8807
const srv = spawn(process.execPath, [join(tmp, 'serve.mjs')], { cwd: tmp, env: { ...process.env, PORT: String(port) }, stdio: 'ignore' })
const base = 'http://127.0.0.1:' + port
for (let i = 0; i < 50; i++) { try { const r = await fetch(base + '/'); if (r.status) break } catch {} await sleep(200) }
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.route('**/*', route => { const u = route.request().url(); return u.startsWith(base) ? route.continue() : route.abort() })
  const page = await ctx.newPage()
  await page.goto(base + '/console/console.html', { waitUntil: 'domcontentloaded' })
  results.push(await probe(page, 'replay'))
  await ctx.close()
}
srv.kill()
await browser.close()

// 报告
const [live, replay] = results
const rows = [
  ['`.cr-shell` 数量', live.dom.crShell, replay.dom.crWbe === undefined ? '-' : replay.dom.crShell],
  ['`.cr-wbe` 区块数量', live.dom.crWbe, replay.dom.crWbe],
  ['当前步骤', JSON.stringify(live.dom.crStepCurrent), JSON.stringify(replay.dom.crStepCurrent)],
  ['步骤导航', JSON.stringify(live.dom.steps), JSON.stringify(replay.dom.steps)],
  ['向导文案', live.dom.foundryText, replay.dom.foundryText],
  ['区块标题', JSON.stringify(live.dom.blockTitles), JSON.stringify(replay.dom.blockTitles)]
]
const md = ['# E02 线上 vs 回放 差异报告', '', `时间: ${new Date().toISOString()}`, '', '| 检查项 | 线上 | 回放 |', '|--------|------|------|']
for (const [k, a, b] of rows) md.push(`| ${k} | ${String(a).slice(0, 120)} | ${String(b).slice(0, 120)} |`)
md.push('', '## 诊断', '', '| 项 | 线上 | 回放 |', '|----|------|------|', `| 定位坐标 | ${JSON.stringify(live.pos)} | ${JSON.stringify(replay.pos)} |`, `| .bc-open 数量 | ${live.diag.opens} | ${replay.diag.opens} |`, `| 卡片标题 | ${JSON.stringify(live.diag.titles)} | ${JSON.stringify(replay.diag.titles)} |`, `| lf_selected_book | ${live.diag.lsBook} | ${replay.diag.lsBook} |`, `| 实际进入的书籍 | ${live.enteredBook} | ${replay.enteredBook} |`, '', '## API 时间线（关键端点）', '', '| 端点 | 线上 | 回放 |', '|------|------|------|')
const flat = l => [...new Set(l)]
const all = flat([...live.apis, ...replay.apis])
for (const a of all) {
  const inLive = live.apis.filter(x => x === a).length
  const inReplay = replay.apis.filter(x => x === a).length
  md.push(`| ${a.slice(0, 90)} | ${inLive} | ${inReplay} |`)
}
md.push('', '## 只在线上出现的请求（回放缺失）', '')
const missing = live.apis.filter(a => !replay.apis.includes(a))
if (missing.length) for (const m of flat(missing)) md.push(`- ${m}`)
else md.push('无')
md.push('', '## 只在回放出现的请求（多余）', '')
const extra = replay.apis.filter(a => !live.apis.includes(a))
if (extra.length) for (const m of flat(extra)) md.push(`- ${m}`)
else md.push('无')

mkdirSync(join(ROOT, 'dev-docs', 'progress-result'), { recursive: true })
writeFileSync(join(ROOT, 'dev-docs', 'progress-result', 'E02-差异报告.md'), md.join('\n'))
console.log(md.join('\n'))
rmSync(tmp, { recursive: true, force: true })
