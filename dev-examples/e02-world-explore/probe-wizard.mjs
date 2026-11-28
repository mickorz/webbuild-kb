// E02 探测3: 进书后 dump 铸造向导按钮与容器，找「世界就位 → 编辑」入口
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
await page.goto('https://bishuxiezuo.cn/console/console.html', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)
const c = await page.evaluate(() => {
  const opens = [...document.querySelectorAll('.bc-open')]
  for (const b of opens) {
    let el = b
    for (let i = 0; i < 8 && el; i++) { el = el.parentElement; if (el && (el.textContent || '').includes('WBTEST-E02')) { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } } }
  }
  return null
})
await page.mouse.move(c.x, c.y); await page.waitForTimeout(800); await page.mouse.click(c.x, c.y)
await page.waitForTimeout(7000)

const dump = await page.evaluate(() => ({
  buttons: [...document.querySelectorAll('button, [role=button], a')].map(b => ({ t: (b.textContent || '').trim().slice(0, 24), cls: String(b.className).slice(0, 40), title: b.getAttribute('title') || '' })).filter(x => x.t || x.title).slice(0, 40),
  crShell: !!document.querySelector('.cr-shell'),
  wbe: document.querySelectorAll('[class*="cr-wbe"]').length,
  steps: [...document.querySelectorAll('[class*="cr-step"], [class*="crs-"]')].map(e => (e.textContent || '').trim().slice(0, 12)).slice(0, 12)
}))
console.log(JSON.stringify(dump, null, 1))
await browser.close()
