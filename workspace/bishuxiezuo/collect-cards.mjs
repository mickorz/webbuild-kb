// 遍历世界/向导/角色相关界面，采集内容卡片（c-content-panel 家族）的真实 HTML，生成展示页
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdirSync } from 'node:fs'

const req = createRequire(new URL('../common/package.json', import.meta.url).href)
const pw = await import(pathToFileURL(req.resolve('playwright')).href)
const chromium = pw.chromium ?? pw.default.chromium

const OUT_DIR = './archive-bishu/files/_gallery'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto('http://localhost:8787/console/console.html', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

const found = new Map()

async function collect(screen) {
  const cards = await page.evaluate(() => {
    const isCard = e => {
      const c = (e.className || '').toString()
      return /c-content-panel|c-relationship-map|cs-document-list/.test(c)
    }
    return [...document.querySelectorAll('div,section,article')].filter(isCard)
      .filter(e => !e.parentElement || !isCard(e.parentElement))
      .map(e => ({ html: e.outerHTML, cls: (e.className || '').toString() }))
  })
  let added = 0
  for (const c of cards) {
    const clsKey = c.cls.split(/\s+/).filter(Boolean).sort().join(' ')
    const actions = [...new Set(c.html.match(/c-content-action (edit|utility|primary)/g) || [])].sort().join(',')
    const sig = `${clsKey}||${actions}`
    if (!found.has(sig)) {
      found.set(sig, {
        sig, clsKey, actions,
        bodyKind: ['c-structured-list', 'c-titled-text', 'cs-document-list', 'c-relationship-map']
          .find(k => c.cls.includes(k)) || 'other',
        editable: /cr-wbe|c-editable-surface/.test(c.cls),
        html: c.html, screen,
      })
      added++
    }
  }
  const view = await page.evaluate(() => document.querySelector('.runtime-admission-content')?.firstElementChild?.className || '?')
  console.log(`  [${screen}] view=${view} 卡片=${cards.length} 新增=${added} 累计=${found.size}`)
}

const clickText = async (t, wait = 3500) => page.evaluate(text => {
  const els = [...document.querySelectorAll('button,[role=button],span,li')]
  const el = els.find(x => (x.textContent || '').trim() === text) || els.find(x => (x.textContent || '').includes(text))
  if (el) { el.click(); return true }
  return false
}, t).then(async ok => { await page.waitForTimeout(wait); return ok })

await page.click('.bc-open', { force: true }); await page.waitForTimeout(4500)
await page.click('[title="世界"]', { force: true }); await page.waitForTimeout(4000)
await collect('世界总览')

// 维度详情
await clickText('信息传播'); await collect('世界 · 维度详情')

// 进向导
console.log('  → 尝试进入向导')
await page.click('[title="世界"]', { force: true }); await page.waitForTimeout(3000)
await clickText('重新编辑世界观', 2000)
await clickText('进入编辑', 5000)
await collect('向导 · 世界观')

// 向导各步：点左侧分组 + 下一步
for (const tab of ['角色表', '故事规划', '世界观']) {
  const ok = await clickText(tab, 3000)
  await collect(`向导 · ${tab}${ok ? '' : '(未找到)'}`)
}

for (let i = 1; i <= 4; i++) {
  const ok = await clickText('通过，下一步', 4000)
  if (!ok) break
  await collect(`向导 · 下一步${i}`)
  // 顺带点一次「编辑」拿编辑态
  if (await clickText('编辑', 2500)) await collect(`向导 · 下一步${i} · 编辑态`)
}

const items = [...found.values()]
console.log(`\n共 ${items.length} 种卡片形态:`)
items.forEach((it, i) => console.log(`  ${String(i + 1).padStart(2, '0')} ${it.bodyKind.padEnd(18)} ${it.screen}`))

const sections = items.map((it, i) => `
  <section class="g-item" id="c${i + 1}">
    <div class="g-meta">
      <span class="g-idx">${String(i + 1).padStart(2, '0')}</span>
      <span class="g-kind">${it.bodyKind}</span>
      ${it.editable ? '<span class="g-tag g-edit">可编辑</span>' : ''}
      ${it.actions ? `<span class="g-tag">${it.actions.replace(/c-content-action /g, '')}</span>` : '<span class="g-tag">无工具条动作</span>'}
      <span class="g-screen">${it.screen}</span>
    </div>
    <details class="g-cls"><summary>类名组合（${it.clsKey.split(' ').length} 个）</summary><code>${it.clsKey}</code></details>
    <div class="g-preview">${it.html}</div>
  </section>`).join('\n')

const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light" data-site="cn">
<head>
<meta charset="UTF-8">
<title>内容卡片形态总览 · ${items.length} 种</title>
<link rel="stylesheet" href="../console/console.css">
<style>
  body { background: #f6f3ec; margin: 0; padding: 40px 56px 80px; font-family: system-ui, -apple-system, "Noto Sans SC", sans-serif; }
  .g-head h1 { font-size: 26px; margin: 0 0 8px; }
  .g-head p { color: #6b6558; margin: 0 0 24px; font-size: 13.5px; line-height: 1.7; }
  .g-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; }
  .g-nav a { font-size: 12px; padding: 5px 10px; border: 1px solid #d9d3c4; border-radius: 999px; color: #4a4436; text-decoration: none; background: #fffdf8; }
  .g-nav a:hover { border-color: #b8863b; color: #8a5f1d; }
  .g-item { margin-bottom: 44px; scroll-margin-top: 20px; }
  .g-meta { display: flex; align-items: center; gap: 9px; font-size: 12px; color: #6b6558; margin-bottom: 8px; flex-wrap: wrap; }
  .g-idx { font-weight: 700; color: #b8863b; font-variant-numeric: tabular-nums; }
  .g-kind { background: #efe8d8; color: #6d5423; padding: 2px 8px; border-radius: 4px; font-family: ui-monospace, monospace; }
  .g-tag { background: #eef1ea; color: #4e5a44; padding: 2px 8px; border-radius: 4px; font-size: 11.5px; }
  .g-edit { background: #f6ecdb; color: #8a5f1d; }
  .g-screen { margin-left: auto; color: #9a9280; }
  .g-cls { margin-bottom: 10px; }
  .g-cls summary { cursor: pointer; font-size: 11.5px; color: #8d8574; }
  .g-cls code { display: block; margin-top: 6px; font-size: 11.5px; color: #6b6558; background: #f1ece0; padding: 8px 10px; border-radius: 6px; line-height: 1.7; word-break: break-all; }
  .g-preview { border: 1px dashed #d9d3c4; border-radius: 10px; padding: 18px; background: #fffdf8; }
  .g-preview > * { margin-top: 0 !important; }
</style>
</head>
<body>
<div class="g-head">
  <h1>内容卡片形态总览</h1>
  <p>离线回放镜像中共采集到 <strong>${items.length}</strong> 种内容卡片形态，按「完整类名组合 + 工具条动作」去重。下方每张卡片都是回放 DOM 里的真实 HTML，样式直接引用镜像内的 <code>console.css</code>。</p>
</div>
<div class="g-nav">
${items.map((it, i) => `<a href="#c${i + 1}">${String(i + 1).padStart(2, '0')} ${it.bodyKind}</a>`).join('\n')}
</div>
${sections}
</body>
</html>`

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(`${OUT_DIR}/cards.html`, html)
writeFileSync(`${OUT_DIR}/cards.json`, JSON.stringify(items, null, 2))
console.log(`\n已生成 ${OUT_DIR}/cards.html`)
await browser.close()
