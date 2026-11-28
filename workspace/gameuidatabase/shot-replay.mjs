import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 1440, height: 2400 } })).newPage()
await p.goto(process.env.REPLAY_URL || 'http://127.0.0.1:8799/', { waitUntil: 'load' })
await p.waitForTimeout(5000)
await p.screenshot({ path: process.env.OUT || 'shot-online.png', fullPage: false })
await b.close()
