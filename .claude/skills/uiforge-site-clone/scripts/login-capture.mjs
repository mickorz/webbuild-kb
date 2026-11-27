#!/usr/bin/env node
// 登录目标站点并保存 Playwright storageState，供 uiforge-archive --storage-state 使用
//
// 用法（在装有 playwright 依赖的目录下运行，约定 workspace/）:
//   node login-capture.mjs --url <登录后入口页URL> [--credentials credentials.json] [--out auth.json] [--button-text 登录]
//
// 凭据 JSON 格式: { "email": "...", "password": "..." }（gitignored，不入库）
// 退出码: 0 成功 / 1 参数或凭据文件问题 / 2 登录未生效
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// playwright 从当前工作目录解析（脚本自身目录可能没有 node_modules，约定在 workspace/ 下运行）
async function loadChromium() {
  let m
  try { m = await import('playwright') } catch {}
  if (!m || !m.chromium) {
    const { createRequire } = await import('node:module')
    const req = createRequire(join(process.cwd(), 'package.json'))
    m = await import(pathToFileURL(req.resolve('playwright')).href)
  }
  const chromium = m.chromium ?? (m.default && m.default.chromium)
  if (!chromium) { console.error('无法从 playwright 模块中取到 chromium 导出'); process.exit(3) }
  return chromium
}

const argv = process.argv.slice(2)
const val = n => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null }
const url = val('--url')
const credPath = val('--credentials') || 'credentials.json'
const outPath = val('--out') || 'auth.json'
const buttonText = val('--button-text')

if (!url) { console.error('缺少 --url（登录后入口页地址）'); process.exit(1) }

let creds
try { creds = JSON.parse(readFileSync(credPath, 'utf8')) }
catch (e) { console.error(`凭据文件不可用: ${credPath}（${e.message}）`); process.exit(1) }
if (!creds.email || !creds.password) { console.error('凭据 JSON 需含 email 与 password 字段'); process.exit(1) }

const EMAIL_SEL = 'input[type="email"], input[name="email"], input[placeholder*="example.com"]'
const PWD_SEL = 'input[type="password"]'
const BTN_PATTERN = buttonText ? new RegExp(buttonText) : /登录|登入|Sign in|Log in/i

const chromium = await loadChromium()

const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()

await page.goto(url, { waitUntil: 'networkidle' })

const emailBox = page.locator(EMAIL_SEL).first()
const pwdBox = page.locator(PWD_SEL).first()
if ((await emailBox.count()) === 0 || (await pwdBox.count()) === 0) {
  console.error('页面上未找到邮箱/密码输入框：该 URL 可能不是登录页，或表单选择器需要人工确认')
  await browser.close()
  process.exit(2)
}
await emailBox.fill(creds.email)
await pwdBox.fill(creds.password)
await page.getByRole('button', { name: BTN_PATTERN }).first().click()

await page.waitForLoadState('networkidle')
await page.waitForTimeout(3000)

const stillLogin = await page.locator(PWD_SEL).count()
console.log('当前 URL:', page.url())
console.log('页面标题:', await page.title())
console.log('密码框仍存在(1=登录失败):', stillLogin)

if (stillLogin > 0) {
  console.error('登录未生效：检查凭据是否正确、登录按钮文本是否匹配（可用 --button-text 覆盖）')
  await browser.close()
  process.exit(2)
}

await context.storageState({ path: outPath })
console.log('storageState 已保存:', outPath)
await browser.close()
