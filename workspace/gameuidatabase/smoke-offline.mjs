// 离线回放交互冒烟：全程拦截外网，只允许本地回放
import { chromium } from 'playwright'
const ORIGIN = process.env.REPLAY_URL || 'http://127.0.0.1:8799/'
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
const external = []
await p.route('**/*', r => r.request().url().startsWith(ORIGIN) ? r.continue() : (external.push(r.request().url()), r.abort()))
const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)

await p.goto(ORIGIN, { waitUntil: 'load' })
await p.waitForTimeout(3500)

const hero = await p.evaluate(() => document.body.innerText.match(/Browse\s+[\d,]+ Games,\s*[\d,]+ Screens and\s*[\d,]+ Videos/)?.[0] || '')
check('首屏计数动画完成', /2,013 Games/.test(hero), hero)
check('零外网请求', external.length === 0, external.slice(0, 3).join(' , ') || 'none')

// 1) 搜索入口（点开搜索浮层）
await p.locator('.input-group.searchdiv').first().click({ force: true }).catch(() => {})
await p.waitForTimeout(800)
const searchOpen = await p.evaluate(() => [...document.querySelectorAll('input')].some(e => (e.offsetWidth || e.offsetHeight) && /search/i.test(e.placeholder)))
check('搜索浮层可打开', searchOpen)

// 2) 深色模式切换
const darkBefore = await p.evaluate(() => document.body.className)
// 站点用的是 jQuery $(sel).click(...) 只绑第一个匹配元素（页面里有重复 id），所以直接点被绑定的那个
await p.evaluate(() => document.getElementById('darkmodetoggle').click()).catch(() => {})
await p.waitForTimeout(800)
const darkAfter = await p.evaluate(() => document.body.className)
check('深色模式切换有响应', darkBefore !== darkAfter, `${darkBefore || '(空)'} -> ${darkAfter || '(空)'}`)

// 3) 站内卡片与链接
const cards = await p.locator('a[href*="index.php"]').count()
check('站内链接已渲染', cards > 50, `${cards} links`)

// 4) 未捕获的二级页给出明确 miss（不静默 204 后白屏）
const resp = await p.request.get(ORIGIN + 'index.php?game=not-captured').catch(() => null)
check('未归档路径返回非 200（可诊断）', !!resp && resp.status() !== 200, resp ? 'status ' + resp.status() : 'no response')

check('零外网请求（交互后）', external.length === 0, external.slice(0, 3).join(' , ') || 'none')
console.log(results.join('\n'))
await p.screenshot({ path: 'smoke-offline.png' })
await b.close()
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0)
