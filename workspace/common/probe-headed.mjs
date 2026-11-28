import { loadChromium, launchFor, challengeGoto } from 'file:///E:/WorkProjects/webbuild-kb/thirdparties/UIForge/tools/uiforge-capture.mjs'
const chromium = await loadChromium()
if (!chromium) { console.error('no playwright'); process.exit(3) }
const { page, close } = await launchFor(chromium, { width: 1440, height: 900 }, { headed: true, profile: 'E:/WorkProjects/webbuild-kb/workspace/gameuidatabase/chrome-profile' })
const ok = await challengeGoto(page, 'https://www.gameuidatabase.com/')
console.log('challenge cleared:', ok, '| title:', await page.title(), '| url:', page.url())
await page.waitForTimeout(3000)
console.log('text:', (await page.evaluate(() => document.body.innerText)).slice(0, 400).replace(/\n+/g, ' | '))
await close()
