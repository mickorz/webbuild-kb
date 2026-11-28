import { loadChromium, launchFor, challengeGoto } from 'file:///E:/WorkProjects/webbuild-kb/thirdparties/UIForge/tools/uiforge-capture.mjs'
const chromium = await loadChromium()
const { page, close } = await launchFor(chromium, { width: 1440, height: 900 }, { profile: 'E:/WorkProjects/webbuild-kb/workspace/gameuidatabase/chrome-profile' })
console.log('challenge cleared:', await challengeGoto(page, 'https://www.gameuidatabase.com/'))
await page.waitForTimeout(4000)
await page.emulateMedia({ reducedMotion: 'reduce' }).catch(() => {})
await page.screenshot({ path: 'live-home.png' })
console.log('live title:', await page.title())
await close()
