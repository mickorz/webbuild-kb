// E02 前置探测: 点击「新建作品」后 dump 弹窗表单（输入框/按钮/文本），不实际创建
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
await page.goto('https://bishuxiezuo.cn/console/console.html', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)

console.log('=== 点击新建作品前书卡 ===')
const cards = await page.evaluate(() => [...document.querySelectorAll('.bc-open')].map(b => {
  const card = b.closest('[class*="card"], [class*="item"], li, div[class]')
  return { openCls: String(b.className), cardText: (card ? card.textContent : '').slice(0, 60) }
}))
console.log(JSON.stringify(cards, null, 1))

await page.click('.c-btn.primary', { force: true })   // 新建作品
await page.waitForTimeout(2500)

const dump = await page.evaluate(() => {
  const out = { inputs: [], buttons: [], dialogText: '' }
  for (const el of document.querySelectorAll('input, textarea, [contenteditable="true"]')) {
    const r = el.getBoundingClientRect()
    if (r.width < 5 || r.height < 5) continue
    out.inputs.push({ tag: el.tagName, type: el.type || '', placeholder: el.placeholder || '', cls: String(el.className).slice(0, 60) })
  }
  const seen = new Set()
  for (const el of document.querySelectorAll('button, [role=button]')) {
    const r = el.getBoundingClientRect()
    if (r.width < 5 || r.height < 5) continue
    const label = (el.textContent || '').trim().slice(0, 20)
    const k = label + '|' + String(el.className).slice(0, 30)
    if (seen.has(k)) continue
    seen.add(k)
    out.buttons.push({ text: label, cls: String(el.className).slice(0, 50) })
  }
  const dlg = document.querySelector('.modal, .dialog, [class*="modal"], [class*="dialog"], [class*="mask"]')
  out.dialogText = dlg ? (dlg.textContent || '').slice(0, 300) : '(未找到弹窗容器)'
  return out
})
console.log('=== 新建作品弹窗 ===')
console.log(JSON.stringify(dump, null, 1))
await browser.close()
