// E02 探测2: hover 卡片 → 点 WBTEST-E02 的「打开 →」→ 检查是否进书
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const BOOK = 'a9379563-e534-4ed3-8996-78b31b1d1bb0'
const req = createRequire(new URL('../../workspace/common/package.json', import.meta.url).href)
const pw = await import(pathToFileURL(req.resolve('playwright')).href)
const chromium = pw.chromium ?? (pw.default && pw.default.chromium)

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'workspace', 'bishuxiezuo', 'auth.json'), 'utf8')) })
const page = await context.newPage()
const api = []
page.on('response', r => {
  const u = new URL(r.url())
  if (u.pathname.startsWith('/api/books/' + BOOK)) api.push(r.request().method() + ' ' + r.status() + ' ' + u.pathname.replace('/api/books/' + BOOK, '<B>'))
})
await page.goto('https://bishuxiezuo.cn/console/console.html', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(7000)

// 找到第二张卡（WBTEST-E02）并 hover
const card = await page.evaluate(() => {
  const opens = [...document.querySelectorAll('.bc-open')]
  for (const b of opens) {
    let el = b
    for (let i = 0; i < 8 && el; i++) { el = el.parentElement; if (el && (el.textContent || '').includes('WBTEST-E02')) { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } } }
  }
  return null
})
console.log('卡片中心坐标:', JSON.stringify(card))
if (card) {
  await page.mouse.move(card.x, card.y)
  await page.waitForTimeout(1200)
  await page.mouse.click(card.x, card.y)
  await page.waitForTimeout(6000)
}
const st = await page.evaluate(() => ({
  text: (document.body.innerText || '').slice(0, 200).replace(/\n+/g, ' | '),
  cscreen: !!document.querySelector('.cscreen'),
  worldEntry: !!document.querySelector('[title="世界"]'),
  lsBook: localStorage.getItem('lf_selected_book')
}))
console.log('点击后:', JSON.stringify(st, null, 1))
console.log('新书 API 请求:', api.length ? api.join('\n  ') : '(无)')
await browser.close()
