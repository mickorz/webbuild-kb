// E02 探测: 打开 WBTEST-E02（当前书架第一张卡），捕获 world 相关 API 与视图结构
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const req = createRequire(new URL('../../workspace/common/package.json', import.meta.url).href)
const pw = await import(pathToFileURL(req.resolve('playwright')).href)
const chromium = pw.chromium ?? (pw.default && pw.default.chromium)

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', 'workspace', 'bishuxiezuo', 'auth.json'), 'utf8')) })
const page = await context.newPage()
let bookId = null
const worldApi = []
page.on('response', async r => {
  const u = new URL(r.url())
  const m = r.request().method()
  if (m === 'GET' && u.pathname === '/api/books' && !bookId) { try { const j = await r.json(); bookId = (j.find(b => b.title === 'WBTEST-E02') || {}).id || null } catch {} }
  if (u.pathname.includes('/world') || u.pathname.includes('/dimension')) worldApi.push({ m, s: r.status(), path: u.pathname })
})
await page.goto('https://bishuxiezuo.cn/console/console.html', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)
// 按卡片文本定位 WBTEST-E02 的打开按钮（祖先链上找包含书名的容器）
const opened = await page.evaluate(() => {
  const opens = [...document.querySelectorAll('.bc-open')]
  for (const b of opens) {
    let el = b
    for (let i = 0; i < 8 && el; i++) {
      el = el.parentElement
      if (el && (el.textContent || '').includes('WBTEST-E02')) {
        const r = b.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      }
    }
  }
  return null
})
console.log('WBTEST-E02 打开按钮坐标:', JSON.stringify(opened))
if (opened) await page.mouse.click(opened.x, opened.y)
await page.waitForTimeout(7000)
console.log('bookId:', bookId)
console.log('world/dimension API:', JSON.stringify(worldApi, null, 1))
const view = await page.evaluate(() => ({
  url: location.href.slice(-40),
  bodyClasses: [...document.querySelectorAll('[class*="cr-"], [class*="world"], [class*="cscreen"]')].slice(0, 10).map(e => String(e.className).slice(0, 50)),
  buttons: [...document.querySelectorAll('button')].map(b => (b.textContent || '').trim()).filter(t => t && t.length < 15).slice(0, 25),
  text: (document.body.innerText || '').slice(0, 400).replace(/\n+/g, ' | ')
}))
console.log('视图:', JSON.stringify(view, null, 1))
await browser.close()
