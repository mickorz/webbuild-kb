// 对比原站与回放：同一 1920x1080 视口截图 + 结构宽度
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const req = createRequire(new URL('./package.json', import.meta.url).href)
const pwMod = await import(pathToFileURL(req.resolve('playwright')).href)
const chromium = pwMod.chromium ?? pwMod.default.chromium
import { readFileSync } from 'node:fs'
const state = JSON.parse(readFileSync(new URL('../bishuxiezuo/auth.json', import.meta.url), 'utf8'))

const targets = [
  ['original', 'https://bishuxiezuo.cn/console/console.html', state],
  ['replay', 'http://localhost:8787/console/console.html', undefined],
]

for (const [name, url, storageState] of targets) {
  const ctx = await chromium.launchPersistentContext('', { viewport: { width: 1920, height: 1080 }, storageState })
  const page = ctx.pages()[0] || await ctx.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(4000)
  await page.screenshot({ path: `cmp-${name}.png` })
  const info = await page.evaluate(() => {
    const shell = document.querySelector('.runtime-admission-shell')
    const content = document.querySelector('.runtime-admission-content')
    const kids = [...(content ? content.children : [])].map(e => ({
      cls: (e.className || '').toString().slice(0, 60),
      w: Math.round(e.getBoundingClientRect().width),
      x: Math.round(e.getBoundingClientRect().x),
    }))
    return {
      bodyW: document.body.clientWidth,
      shellDataMobile: shell ? shell.getAttribute('data-mobile') : null,
      contentW: content ? Math.round(content.getBoundingClientRect().width) : null,
      kids,
    }
  })
  console.log(`=== ${name} ===`)
  console.log(JSON.stringify(info, null, 1))
  await ctx.close()
}
