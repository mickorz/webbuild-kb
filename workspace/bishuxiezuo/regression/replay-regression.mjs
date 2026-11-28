#!/usr/bin/env node
// Replay Regression Runner（Batch 5）— 自动验证离线回放的正确性
//
// 用法（本目录下）: node replay-regression.mjs [--archive ../archive-bishu] [--scenarios ./scenarios.json] [--out ./report]
//
// 工程约束:
//   1 不改原始归档: 每次运行复制归档到 .run/archive 临时副本，serve v2.3 模板从 skill scripts 取最新版
//   2 每个页面场景独立 Browser Context，互不污染
//   3 回放服务器独立端口（自动找空闲口），运行结束自动关闭
//   4 离线守卫: 非本机回放端口的请求一律 abort 并计入违规，禁止意外请求原站
//   5 Windows 原生 node 直接运行，无平台特定命令
//   6 任一断言失败进程退出码非零，可接 CI
//
// 断言分层:
//   L1 页面: 选择器可见 / 页面文本 / 元素计数
//   L2 API: 状态码 + JSON 字段断言（dot-path，支持 present / contains: 前缀）
//   L3 匹配: unmatched-requests.jsonl 增量的 kind 检查（forbidKinds 默认禁 unmatched/ambiguous-*）
//   L4 完整性: 外部请求拦截数、console 错误数上限
// 失败证据（仅失败场景）: 截图、DOM 快照、console 错误、网络摘要、unmatched 增量 → report/evidence/<场景>/
import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve, dirname } from 'node:path'
import { spawn } from 'node:child_process'
import net from 'node:net'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..', '..', '..')
const argv = process.argv.slice(2)
const val = n => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null }
const archiveDir = resolve(HERE, val('--archive') || '../archive-bishu')
const scenPath = resolve(HERE, val('--scenarios') || './scenarios.json')
const outDir = resolve(HERE, val('--out') || './report')
const DEFAULT_FORBID = ['unmatched', 'ambiguous-body-variant', 'ambiguous-query-variant']
const FALLBACK_KINDS = ['body-variant-fallback', 'query-variant-fallback', 'request-body-truncated']

if (!existsSync(join(archiveDir, 'index.json'))) { console.error('归档不存在:', archiveDir); process.exit(1) }
const conf = JSON.parse(readFileSync(scenPath, 'utf8'))

// playwright 解析: workspace/common
const req = createRequire(new URL('../../common/package.json', import.meta.url).href)
const pw = await import(pathToFileURL(req.resolve('playwright')).href)
const chromium = pw.chromium ?? (pw.default && pw.default.chromium)

// ---- 临时副本 + serve ----
const runDir = join(HERE, '.run')
rmSync(runDir, { recursive: true, force: true })
const tmpArch = join(runDir, 'archive')
cpSync(archiveDir, tmpArch, { recursive: true })
cpSync(join(ROOT, '.claude', 'skills', 'uiforge-site-clone', 'scripts', 'replay-serve-v2.mjs'), join(tmpArch, 'serve.mjs'))
const unmatchedPath = join(tmpArch, 'unmatched-requests.jsonl')
const readUnmatched = () => existsSync(unmatchedPath) ? readFileSync(unmatchedPath, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : []

const freePort = start => new Promise(res => {
  const s = net.createServer()
  s.once('listening', () => s.close(() => res(start)))
  s.once('error', () => { s.close(); res(freePort(start + 1)) })
  s.listen(start, '127.0.0.1')
})
const sleep = ms => new Promise(r => setTimeout(r, ms))
// FIFO 消费计数在服务端进程内，每个场景重启 serve 以隔离状态（Batch 5.1）
async function startServe() {
  const port = await freePort(conf.port || 8795)
  const child = spawn(process.execPath, [join(tmpArch, 'serve.mjs')], { cwd: tmpArch, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] })
  const log = []
  child.stdout.on('data', d => log.push(String(d)))
  child.stderr.on('data', d => log.push(String(d)))
  const b = 'http://127.0.0.1:' + port
  for (let i = 0; i < 40; i++) { try { const r = await fetch(b + '/'); if (r.status) return { child, base: b, port } } catch {} await sleep(300) }
  console.error('回放服务器启动失败:\n' + log.join(''))
  child.kill()
  throw new Error('serve 启动失败')
}
let { child: serve, base, port: lastPort } = await startServe()

// ---- 断言工具 ----
const getp = (o, path) => path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean).reduce((a, k) => a == null ? a : (/^\d+$/.test(k) ? a[Number(k)] : a[k]), o)
const checkField = (body, spec) => {
  const v = getp(body, spec.key)
  if (spec.expect === 'present') return v !== undefined && v !== null
  if (typeof spec.expect === 'string' && spec.expect.startsWith('contains:')) return typeof v === 'string' && v.includes(spec.expect.slice(9))
  return v === spec.expect
}
const normPathQ = u => { try { const x = new URL(u); const sp = [...x.searchParams.entries()].sort((p, q) => p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : 0); return x.pathname + (sp.length ? '?' + sp.map(([k, v]) => k + '=' + v).join('&') : '') } catch { return u } }
const pathOf = u => { try { return new URL(u).pathname } catch { return u } }
const sha12 = s => createHash('sha256').update(s || '').digest('hex').slice(0, 12)
// 变体感知匹配: method + pathname + 可选 query 逐项 + 可选请求体完全一致（Batch 5.1）
const findCapture = (net, a) => {
  const hit = net.filter(x => {
    if (x.method !== a.method) return false
    try { if (new URL(x.url).pathname !== a.path) return false } catch { return false }
    if (a.query) { let q = {}; try { q = Object.fromEntries(new URL(x.url).searchParams) } catch {}; for (const [k, v] of Object.entries(a.query)) if (String(q[k]) !== String(v)) return false }
    if (a.body !== undefined && (x.postData || '') !== a.body) return false
    return true
  })
  return hit.length ? hit[hit.length - 1] : null
}

// ---- 场景执行 ----
const browser = await chromium.launch({ headless: true })
const results = []
rmSync(join(outDir, 'evidence'), { recursive: true, force: true })
const originHost = (() => { try { return new URL(JSON.parse(readFileSync(join(tmpArch, 'index.json'), 'utf8')).origin).host } catch { return '' } })()
const recorded404 = new Set(JSON.parse(readFileSync(join(tmpArch, 'index.json'), 'utf8')).entries.filter(e => e.status === 404).map(e => { try { return new URL(e.url).pathname } catch { return e.url } }))

for (const sc of conf.scenarios) {
  const t0 = Date.now()
  const ev = join(outDir, 'evidence', sc.id)
  const beforeUn = readUnmatched().length
  const checks = []   // { layer, name, pass, detail }
  const add = (layer, name, pass, detail) => checks.push({ layer, name, pass, detail: detail || '' })
  const fails = () => checks.filter(c => !c.pass)
  const saveEvidence = async (page, net, consoleErrors, blocked) => {
    mkdirSync(ev, { recursive: true })
    if (page) { try { await page.screenshot({ path: join(ev, 'screenshot.png'), fullPage: false }) } catch {} try { writeFileSync(join(ev, 'dom.html'), await page.content()) } catch {} }
    writeFileSync(join(ev, 'console-errors.json'), JSON.stringify(consoleErrors, null, 2))
    writeFileSync(join(ev, 'network-summary.json'), JSON.stringify(net.map(x => ({ method: x.method, url: x.url, status: x.status })), null, 2))
    writeFileSync(join(ev, 'blocked-external.json'), JSON.stringify(blocked, null, 2))
    writeFileSync(join(ev, 'unmatched-delta.json'), JSON.stringify(readUnmatched().slice(beforeUn), null, 2))
  }

  if (sc.type === 'page') {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const blocked = []
    await context.route('**/*', route => {
      const u = route.request().url()
      if (u.startsWith(base)) return route.continue()
      blocked.push(u)
      return route.abort()
    })
    const page = await context.newPage()
    const consoleErrors = []
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)) })
    page.on('pageerror', e => consoleErrors.push(String(e).slice(0, 300)))
    const net = []
    page.on('response', async r => {
      try {
        const q = r.request()
        let body = null
        try { body = (await r.body()).slice(0, 1024 * 1024).toString('utf8') } catch {}
        net.push({ method: q.method(), url: r.url(), status: r.status(), postData: q.postData() || null, body })
      } catch {}
    })
    try {
      await page.goto(base + (sc.path || '/'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      if (sc.lsSeed) {
        // 写入 localStorage 种子并重载（如 lf_selected_book 直接进指定书籍，绕开列表 FIFO 起点问题）
        for (const [k, v] of Object.entries(sc.lsSeed)) await page.evaluate(([k, v]) => localStorage.setItem(k, v), [k, v])
        await page.reload({ waitUntil: 'domcontentloaded' })
      }
      await page.waitForTimeout(sc.settle || 6000)
      let stepFails = 0
      for (const st of sc.steps || []) {
        const wait = st.wait || 3000
        let ok = false, how = st.click || st.clickText || st.clickCard || (st.fill !== undefined ? 'fill ' + st.fill + '=' + st.value : '')
        try {
          if (st.clickCard) {
            // 进书：按卡片文本定位 .bc-open（hover 后才出现），走真实鼠标坐标
            const pos = await page.evaluate(t => {
              for (const b of document.querySelectorAll('.bc-open')) {
                let el = b
                for (let i = 0; i < 8 && el; i++) {
                  el = el.parentElement
                  // 容器必须只含 1 个 .bc-open，否则会命中整个列表容器而点到相邻书籍
                  if (el && (el.textContent || '').includes(t) && el.querySelectorAll('.bc-open').length === 1) { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }
                }
              }
              return null
            }, st.clickCard)
            if (pos) { await page.mouse.move(pos.x, pos.y); await page.waitForTimeout(900); await page.mouse.click(pos.x, pos.y); ok = true }
          }
          else if (st.fill !== undefined) {
            const loc = page.locator(st.fill).first()
            await loc.fill(st.value || '', { timeout: 15000 })
            if (st.enter) await loc.press('Enter')
            ok = true
          }
          else if (st.click) { await page.click(st.click, { force: true, timeout: 15000 }); ok = true }
          else if (st.clickText) {
            ok = await page.evaluate(text => {
              const els = [...document.querySelectorAll('button, [role=button], a, span')]
              const t = els.find(b => (b.textContent || '').trim() === text) || els.find(b => (b.textContent || '').includes(text))
              if (!t) return false
              t.click(); return true
            }, st.clickText)
          }
        } catch (e) { ok = false }
        if (!ok) stepFails++
        await page.waitForTimeout(wait)
        add('L1', 'step ' + how, ok, ok ? '' : '步骤未命中')
        // 步内 DOM 断言: 支持操作后立即验证界面状态变化（如搜索过滤结果）
        if (ok && st.expectText) {
          const has = (await page.evaluate(() => document.body.innerText)).includes(st.expectText)
          add('L1', `step 后应出现「${st.expectText}」`, has, has ? '' : '未出现')
        }
        if (ok && st.expectTextAbsent) {
          const gone = !(await page.evaluate(() => document.body.innerText)).includes(st.expectTextAbsent)
          add('L1', `step 后应消失「${st.expectTextAbsent}」`, gone, gone ? '' : '仍然可见')
        }
      }
      for (const d of sc.dom || []) {
        let ok = false, detail = ''
        try {
          if (d.text) { ok = (await page.evaluate(() => document.body.innerText)).includes(d.text); detail = d.text }
          else if (d.count !== undefined) { const n = await page.locator(d.count).count(); ok = n >= (d.gte ?? 1); detail = `${d.count} count=${n}` }
          else { ok = await page.locator(d.sel).first().isVisible({ timeout: 3000 }).catch(() => false); detail = d.sel }
        } catch (e) { detail = String(e).slice(0, 120) }
        add('L1', 'dom ' + (d.text || d.sel), ok, ok ? '' : detail)
      }
      for (const a of sc.api || []) {
        const cap = findCapture(net, a)
        if (!cap) { add('L2', `api ${a.method} ${a.path}`, false, '场景期间未观察到该请求（含变体条件）'); continue }
        let ok = cap.status === a.status
        add('L2', `api ${a.method} ${a.path} status=${a.status}`, ok, ok ? '' : '实际 ' + cap.status)
        if (ok && a.fields) {
          // 字段断言优先用捕获体；捕获体不可用才重放同签名兑底（会推进服务端 FIFO，非默认路径）
          let body = null
          try { body = JSON.parse(cap.body) } catch {}
          if (!body) {
            const rr = await fetch(base + a.path, { method: a.method, body: cap.postData || undefined, headers: cap.postData ? { 'content-type': 'application/json' } : undefined })
            const txt = await rr.text()
            try { body = JSON.parse(txt) } catch {}
          }
          for (const [k, v] of Object.entries(a.fields)) {
            const pass = body ? checkField(body, { key: k, expect: v }) : false
            add('L2', `api ${a.method} ${a.path} ${k}`, pass, pass ? '' : `期望 ${v}，实际 ${JSON.stringify(getp(body, k))}`)
          }
        }
      }
      const newUn = readUnmatched().slice(beforeUn)
      const forbid = sc.forbidKinds || DEFAULT_FORBID
      const bad = newUn.filter(u => forbid.includes(u.kind))
      add('L3', 'forbid unmatched/ambiguous', bad.length === 0, bad.length ? bad.map(b => b.kind + ' ' + b.url).join('; ') : '')
      // fallback 白名单: 只允许明确登记的回退，其余直接失败（Batch 5.1）
      const fallbacks = newUn.filter(u => FALLBACK_KINDS.includes(u.kind))
      const registered = sc.expectedFallbacks || []
      const unreg = fallbacks.filter(u => !registered.some(r => r.kind === u.kind && pathOf(u.url) === r.path))
      add('L3', 'fallback 白名单', unreg.length === 0, unreg.length ? unreg.map(u => u.kind + ' ' + u.url).join('; ') : `全部命中登记（${fallbacks.length} 条）`)
      const maxErr = sc.maxConsoleErrors ?? 0
      // 资源类 console 噪声不计入: net::ERR_FAILED 是我们拦截第三方依赖造成的；404 由下方专项检查接管
      const jsErrors = consoleErrors.filter(t => !t.startsWith('Failed to load resource'))
      add('L4', `JS 错误 ≤ ${maxErr}`, jsErrors.length <= maxErr, jsErrors.slice(0, 3).join(' | '))
      const bad404 = net.filter(x => x.status === 404 && !recorded404.has(pathOf(x.url)))
      add('L4', '404 均为录制态（无新增）', bad404.length === 0, bad404.slice(0, 3).map(x => x.url).join(' | '))
      const originLeak = blocked.filter(u => originHost && u.includes(originHost))
      const thirdParty = blocked.filter(u => !originLeak.includes(u))
      add('L4', '无原站泄漏（离线守卫拦截）', originLeak.length === 0, originLeak.slice(0, 3).join(' | '))
      add('L4', '第三方外部依赖已拦截（记录不失败）', true, thirdParty.length ? thirdParty.slice(0, 3).join(' | ') + ` 共${thirdParty.length}条` : '无')
      if (fails().length) await saveEvidence(page, net, consoleErrors, blocked)
    } catch (e) {
      add('L1', '场景执行异常', false, String(e).slice(0, 300))
      try { await saveEvidence(page, net, consoleErrors, blocked) } catch {}
    }
    await context.close()
  } else {
    // api 场景: 纯 fetch，无浏览器
    try {
      for (const rq of sc.requests || []) {
        const one = async () => { const r = await fetch(base + rq.path, { method: rq.method || 'GET', body: rq.body, headers: rq.headers }); return { status: r.status, text: await r.text() } }
        if (rq.concurrent) {
          const rs = await Promise.all(Array.from({ length: rq.concurrent }, one))
          const exp = rq.expect || {}
          const stOK = rs.every(r => r.status === exp.status)
          add('L2', `${rq.name} 并发${rq.concurrent} 全部 ${exp.status}`, stOK, rs.map(r => r.status).join(','))
          if (exp.allSameBody) {
            const same = new Set(rs.map(r => r.text)).size === 1
            add('L3', `${rq.name} 并发响应确定性（单版本钳位）`, same, '去重后 ' + new Set(rs.map(r => r.text)).size + ' 种响应')
          }
        } else {
          const r = await one()
          const exp = rq.expect || {}
          let ok = r.status === exp.status
          add('L2', `${rq.name} status=${exp.status}`, ok, ok ? '' : `实际 ${r.status} ${r.text.slice(0, 120)}`)
          if (ok && exp.fields) for (const [k, v] of Object.entries(exp.fields)) {
            let body = null; try { body = JSON.parse(r.text) } catch {}
            const pass = body ? checkField(body, { key: k, expect: v }) : false
            add('L2', `${rq.name} ${k}`, pass, pass ? '' : `期望 ${v}`)
          }
        }
      }
      const newUn = readUnmatched().slice(beforeUn)
      const kinds = new Set(newUn.map(u => u.kind))
      if (sc.expectKinds) for (const k of sc.expectKinds) add('L3', '期望留痕 kind: ' + k, kinds.has(k), [...kinds].join(','))
      const forbid = sc.forbidKinds || []
      const bad = newUn.filter(u => forbid.includes(u.kind))
      add('L3', 'forbid ' + (forbid.join('/') || '无'), bad.length === 0, bad.map(b => b.kind + ' ' + b.url).join('; '))
      const fallbacks = newUn.filter(u => FALLBACK_KINDS.includes(u.kind))
      const unreg = fallbacks.filter(u => !(sc.expectedFallbacks || []).some(r => r.kind === u.kind && pathOf(u.url) === r.path))
      add('L3', 'fallback 白名单', unreg.length === 0, unreg.length ? unreg.map(u => u.kind + ' ' + u.url).join('; ') : `全部命中登记（${fallbacks.length} 条）`)
    } catch (e) { add('L2', 'api 场景执行异常', false, String(e).slice(0, 300)) }
  }

  const passed = fails().length === 0
  results.push({ id: sc.id, name: sc.name, type: sc.type || 'api', pass: passed, checks, unmatched: readUnmatched().slice(beforeUn), ms: Date.now() - t0 })
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${sc.id} ${sc.name}  (${fails().length} 项失败, ${Date.now() - t0}ms)`)
  for (const f of fails()) console.log(`      [${f.layer}] ${f.name} — ${f.detail}`)
  // 场景间重启 serve: 隔离服务端 FIFO 消费状态
  serve.kill()
  try { ({ child: serve, base, port: lastPort } = await startServe()) } catch (e) { console.error(String(e)); process.exit(1) }
}

await browser.close()
serve.kill()

// ---- 报告 ----
const totalUn = readUnmatched()
const fallbackCount = totalUn.filter(u => FALLBACK_KINDS.includes(u.kind)).length
const passed = results.filter(r => r.pass).length
const md = []
md.push('# Replay Coverage Report')
md.push('')
md.push(`- 归档: ${archiveDir}（临时副本） | serve: v2.3 | 端口: ${lastPort}`)
md.push(`- 时间: ${new Date().toISOString()}`)
md.push(`- 场景: ${passed}/${results.length} 通过 | unmatched ${totalUn.filter(u => u.kind === 'unmatched').length} | 歧义拒绝 ${totalUn.filter(u => String(u.kind).startsWith('ambiguous')).length} | 宽松回退/截断留痕 ${fallbackCount}`)
md.push('')
md.push('| 场景 | 内容 | 结果 | unmatched+歧义 | 回退留痕 | 失败断言 |')
md.push('|------|------|------|----------------|----------|----------|')
for (const r of results) {
  const forb = r.unmatched.filter(u => DEFAULT_FORBID.includes(u.kind)).length
  const fb = r.unmatched.filter(u => FALLBACK_KINDS.includes(u.kind)).length
  md.push(`| ${r.id} ${r.name} | ${r.type} | ${r.pass ? 'PASS' : 'FAIL'} | ${forb} | ${fb} | ${r.pass ? '-' : r.checks.filter(c => !c.pass).map(c => `[${c.layer}]${c.name}`).join('<br>')} |`)
}
md.push('')
mkdirSync(outDir, { recursive: true })
const ts = new Date().toISOString().replace(/[:.]/g, '-')
writeFileSync(join(outDir, 'ReplayCoverageReport.md'), md.join('\n'))
writeFileSync(join(outDir, `coverage-${ts}.json`), JSON.stringify({ base, passed, total: results.length, results, unmatched: totalUn }, null, 2))
console.log(`\n通过 ${passed}/${results.length} | 报告: ${join(outDir, 'ReplayCoverageReport.md')}`)
rmSync(runDir, { recursive: true, force: true })
process.exitCode = passed === results.length ? 0 : 1
