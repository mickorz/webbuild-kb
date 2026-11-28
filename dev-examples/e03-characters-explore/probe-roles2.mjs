// E03 探测: 点步骤导航回到「角色表」，dump 角色卡片与编辑入口
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
await page.waitForTimeout(5000)
await page.evaluate(b => localStorage.setItem('lf_selected_book', b), BOOK)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(7000)

const hasWizard = await page.evaluate(() => !!document.querySelector('.cr-shell'))
if (!hasWizard) {
  const c = await page.evaluate(() => {
    for (const b of document.querySelectorAll('.bc-open')) {
      let el = b
      for (let i = 0; i < 8 && el; i++) { el = el.parentElement; if (el && (el.textContent || '').includes('WBTEST-E02')) { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } } }
    }
    return null
  })
  if (c) { await page.mouse.move(c.x, c.y); await page.waitForTimeout(700); await page.mouse.click(c.x, c.y); await page.waitForTimeout(7000) }
}

// 点步骤导航「角色表」
const went = await page.evaluate(() => {
  const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent || '').trim() === '角色表')
  for (const e of els) {
    let p = e
    for (let i = 0; i < 4 && p; i++) {
      if (p.tagName === 'BUTTON' || p.getAttribute('role') === 'button' || p.className.includes('step')) { p.click(); return 'clicked:' + String(p.className).slice(0, 40) }
      p = p.parentElement
    }
  }
  return 'not-found'
})
console.log('跳转角色表:', went)
await page.waitForTimeout(7000)

const dump = await page.evaluate(() => ({
  text: (document.body.innerText || '').slice(0, 700).replace(/\n+/g, ' | '),
  wbe: [...document.querySelectorAll('[class*="cr-wbe"]')].map(e => ({ cls: String(e.className).slice(0, 50), t: (e.textContent || '').slice(0, 40) })),
  actions: [...document.querySelectorAll('[class*="c-content-action"], button')].map(b => ({ t: (b.textContent || '').trim().slice(0, 18), cls: String(b.className).slice(0, 44) })).filter(x => x.t).slice(0, 20)
}))
console.log(JSON.stringify(dump, null, 1).slice(0, 2500))
await browser.close()
