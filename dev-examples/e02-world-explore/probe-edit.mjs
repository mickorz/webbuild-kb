// E02 探测4: 点第一个维度的「编辑」，dump 编辑态（输入框/保存/取消）
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
page.on('response', r => { const u = new URL(r.url()); if (u.pathname.startsWith('/api/books/' + BOOK)) api.push(r.request().method() + ' ' + r.status() + ' ' + u.pathname.replace('/api/books/' + BOOK, '<B>')) })
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
await page.mouse.move(c.x, c.y); await page.waitForTimeout(600); await page.mouse.click(c.x, c.y)
await page.waitForTimeout(6000)

// 记录编辑前的第一个 cr-wbe 区块文本
const before = await page.evaluate(() => {
  const w = document.querySelector('[class*="cr-wbe"]')
  return { cls: String(w.className).slice(0, 60), text: (w.textContent || '').slice(0, 80) }
})
console.log('第一个维度区块:', JSON.stringify(before))

await page.click('.cr-wbe-edit', { force: true })
await page.waitForTimeout(2500)
const editState = await page.evaluate(() => ({
  inputs: [...document.querySelectorAll('input, textarea, [contenteditable="true"]')].filter(e => e.getBoundingClientRect().width > 5).map(e => ({ tag: e.tagName, cls: String(e.className).slice(0, 40), placeholder: e.placeholder || '', value: (e.value || e.textContent || '').slice(0, 60) })),
  buttons: [...document.querySelectorAll('button, [role=button]')].map(b => ({ t: (b.textContent || '').trim().slice(0, 16), cls: String(b.className).slice(0, 36) })).filter(x => x.t).slice(0, 25)
}))
console.log('编辑态:', JSON.stringify(editState, null, 1))
console.log('API:', api.join(' | '))
await browser.close()
