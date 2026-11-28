// 离线回放验证：拦掉一切外网请求，确认归档页自洽渲染
import { chromium } from 'playwright'
const TARGET = process.env.REPLAY_URL || 'http://127.0.0.1:8799/'
const ORIGIN = TARGET.replace(/\/$/, '')
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
const external = []
await p.route('**/*', r => {
  const u = r.request().url()
  if (u.startsWith(ORIGIN + '/')) return r.continue()
  external.push('< ' + u)
  return r.abort()
})
const reqs = []
p.on('requestfailed', q => {})
await p.goto(TARGET, { waitUntil: 'load', timeout: 30000 })
await p.waitForTimeout(4000)
console.log('title:', await p.title())
console.log('text:', (await p.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\n+/g, ' | '))
console.log('games rendered:', await p.evaluate(() => document.querySelectorAll('a[href*="game"], .card, .game-card').length))
console.log('img count:', await p.evaluate(() => document.images.length), 'broken imgs:', await p.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).length))
console.log('blocked external requests:', external.length, [...new Set(external)].slice(0, 8))
await p.screenshot({ path: 'E:/WorkProjects/webbuild-kb/workspace/gameuidatabase/replay-home.png', fullPage: false })
await b.close()
