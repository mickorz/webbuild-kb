import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await p.route('**/*', r => r.request().url().startsWith(process.env.REPLAY_URL) ? r.continue() : r.abort())
await p.goto(process.env.REPLAY_URL, { waitUntil: 'load' })
await p.waitForTimeout(4000)
console.log(await p.evaluate(() => {
  const has = t => [...document.querySelectorAll('h1,h2,h3,h4,div,span')].some(e => e.textContent.trim().toUpperCase().startsWith(t))
  return {
    daily: has('DAILY UPDATES'), featured: has('NEW & FEATURED'), discover: has('DISCOVER'),
    counterText: [...document.querySelectorAll('h1,h2')].map(e => e.textContent.trim().slice(0,90)).filter(Boolean),
    cards: document.querySelectorAll('.game-card, .card, .gc, .gameblock').length,
    apiCalls: performance.getEntriesByType('resource').map(r => r.name).filter(n => n.includes('/api') || n.includes('.php')).slice(0, 20),
  }
}))
await p.screenshot({ path: 'replay-full.png', fullPage: true })
await b.close()
