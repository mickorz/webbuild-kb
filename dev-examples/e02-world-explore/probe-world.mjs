// E02 探测: 带 lf_selected_book 种子进 WBTEST-E02，dump 世界观视图结构
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
let worldJson = null
page.on('response', async r => {
  const u = new URL(r.url())
  if (u.pathname === `/api/books/${BOOK}/world`) { try { worldJson = await r.json() } catch {} }
})
await page.goto('https://bishuxiezuo.cn/console/console.html', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
await page.evaluate(b => localStorage.setItem('lf_selected_book', b), BOOK)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(8000)

const view = await page.evaluate(() => ({
  screenText: (document.body.innerText || '').slice(0, 250).replace(/\n+/g, ' | '),
  worldEntry: !!document.querySelector('[title="世界"]'),
  buttons: [...document.querySelectorAll('button, [role=button]')].map(b => (b.textContent || '').trim()).filter(t => t && t.length < 20).slice(0, 30)
}))
console.log('入书后视图:', JSON.stringify(view, null, 1))
console.log('world API 结构:', JSON.stringify(worldJson, null, 1).slice(0, 1200))

if (view.worldEntry) {
  await page.click('[title="世界"]', { force: true })
  await page.waitForTimeout(6000)
  const wv = await page.evaluate(() => ({
    text: (document.body.innerText || '').slice(0, 400).replace(/\n+/g, ' | '),
    buttons: [...document.querySelectorAll('button, [role=button]')].map(b => (b.textContent || '').trim()).filter(t => t && t.length < 20).slice(0, 30),
    crClasses: [...new Set([...document.querySelectorAll('[class*="cr-"]')].map(e => String(e.className).split(' ')[0]))].slice(0, 20)
  }))
  console.log('世界视图:', JSON.stringify(wv, null, 1))
}
await browser.close()
