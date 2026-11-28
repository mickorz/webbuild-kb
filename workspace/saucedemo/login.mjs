// saucedemo.com 登录并保存 storageState（公开测试凭据：standard_user / secret_sauce）
// 用法（workspace/saucedemo 下）: node login.mjs [--out ./auth.json]
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { writeFileSync } from 'node:fs'

const req = createRequire(new URL('../common/package.json', import.meta.url).href)
const pw = await import(pathToFileURL(req.resolve('playwright')).href)
const chromium = pw.chromium ?? (pw.default && pw.default.chromium)

const argv = process.argv.slice(2)
const i = argv.indexOf('--out')
const out = i >= 0 && argv[i + 1] ? argv[i + 1] : './auth.json'

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
await page.goto('https://www.saucedemo.com/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
await page.fill('#user-name', 'standard_user')
await page.fill('#password', 'secret_sauce')
await page.click('#login-button')
await page.waitForTimeout(4000)

const state = await page.evaluate(() => ({
  url: location.href,
  title: document.title,
  items: document.querySelectorAll('.inventory_item').length,
  loggedIn: !document.querySelector('#login-button')
}))
console.log('登录后:', state.url.slice(-30), '| 商品数:', state.items, '| 已登录:', state.loggedIn)
if (!state.loggedIn) { console.error('登录未生效'); process.exit(2) }
writeFileSync(out, JSON.stringify(await context.storageState(), null, 2))
console.log('storageState 已保存:', out)
await browser.close()
