// 登录 bishuxiezuo.cn 并保存 storageState，供 uiforge-archive --storage-state 使用
// 凭据从 credentials.json 读取（已 gitignore，不入库）
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const { email: EMAIL, password: PASSWORD } = JSON.parse(readFileSync('credentials.json', 'utf8'))
const URL = 'https://bishuxiezuo.cn/console/console.html'

const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()

await page.goto(URL, { waitUntil: 'networkidle' })

// 填写登录表单
const email = page.locator('input[type="email"], input[placeholder*="example.com"]').first()
const pwd = page.locator('input[type="password"]').first()
await email.fill(EMAIL)
await pwd.fill(PASSWORD)

// 点击登录按钮
await page.getByRole('button', { name: /登录并进入控制台|登录/ }).first().click()

// 等待登录完成（跳转或页面变化）
await page.waitForLoadState('networkidle')
await page.waitForTimeout(3000)

// 检查是否还在登录页
const stillLogin = await page.locator('input[type="password"]').count()
console.log('当前 URL:', page.url())
console.log('页面标题:', await page.title())
console.log('密码框仍存在(1=还在登录页):', stillLogin)

await context.storageState({ path: 'auth.json' })
console.log('storageState 已保存到 auth.json')
await browser.close()
