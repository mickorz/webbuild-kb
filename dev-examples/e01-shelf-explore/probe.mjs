// E01 书架探索: 探测书架区域的可交互控件（输入框/按钮/下拉/分页），为补采步骤提供选择器
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

const dump = await page.evaluate(() => {
  const out = { inputs: [], buttons: [], selects: [], textSamples: [] }
  for (const el of document.querySelectorAll('input, textarea')) {
    const r = el.getBoundingClientRect()
    if (r.width < 5 || r.height < 5) continue
    out.inputs.push({ tag: el.tagName, type: el.type || '', placeholder: el.placeholder || '', id: el.id || '', cls: String(el.className).slice(0, 60), visible: !el.disabled })
  }
  const seen = new Set()
  for (const el of document.querySelectorAll('button, [role=button], [role=combobox], select')) {
    const r = el.getBoundingClientRect()
    if (r.width < 5 || r.height < 5) continue
    const label = (el.textContent || '').trim().slice(0, 30) || el.getAttribute('title') || el.getAttribute('aria-label') || ''
    const k = el.tagName + '|' + label + '|' + String(el.className).slice(0, 30)
    if (seen.has(k)) continue
    seen.add(k)
    ;(el.tagName === 'SELECT' || el.getAttribute('role') === 'combobox' ? out.selects : out.buttons).push({ tag: el.tagName, text: label, id: el.id || '', cls: String(el.className).slice(0, 60), title: el.getAttribute('title') || '' })
  }
  return out
})
console.log(JSON.stringify(dump, null, 1))
await browser.close()
