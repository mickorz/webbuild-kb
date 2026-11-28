#!/usr/bin/env node
// API 覆盖率审计：检查 UIForge 归档里 API 采集的完整性与异常
//
// 用法（仓库根目录下）:
//   node .claude/skills/uiforge-site-clone/scripts/api-coverage-audit.mjs \
//     --archive workspace/bishuxiezuo/archive-bishu [--out api-coverage-report.md] [--extra 另一份index.json]
//
// 检查项:
//   1 端点清点: method + path 分组，状态分布，条目数
//   2 异常状态: API 端点录到 401/403/404/5xx（登录态失效或接口异常的直接信号）
//   3 变体冲突: 同 method + path 存在多条目（query 或请求体不同的变体）
//   4 请求体缺失: POST 条目没有 reqBody 字段（旧格式采集或本就无请求体，回放无法按请求体区分）
//   5 归档文件缺失: 条目指向的 files/ 文件在磁盘上不存在
//   6 采集丢弃: capture-failures.jsonl 汇总（响应体不可读 / 超限 / handler 异常）
//   7 --extra 对比: 另一份采集里存在而本归档没有的端点（漏采清单）
//   8 回放未命中: unmatched-requests.jsonl 汇总（serve v2 运行时产生，含变体回退留痕，即补采任务清单）
//
// 输出: 控制台摘要 + markdown 报告。退出码: 0 正常 / 1 归档不存在
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const argv = process.argv.slice(2)
const val = n => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null }
const archiveDir = resolve(val('--archive') || '')
const extraArg = val('--extra')
if (!archiveDir || !existsSync(join(archiveDir, 'index.json'))) {
  console.error('用法: node api-coverage-audit.mjs --archive <归档目录> [--out 报告.md] [--extra 另一份index.json]')
  process.exit(1)
}
const outPath = val('--out') ? resolve(val('--out')) : join(archiveDir, '..', 'api-coverage-report.md')

const idx = JSON.parse(readFileSync(join(archiveDir, 'index.json'), 'utf8'))
const entries = idx.entries || []
const pathOf = u => { try { return new URL(u).pathname } catch { return u } }
const isApi = e => pathOf(e.url).includes('/api/')

// 1 端点分组: method + path
const groups = new Map()
for (const e of entries) {
  const p = pathOf(e.url)
  const gk = e.method + ' ' + p
  if (!groups.has(gk)) groups.set(gk, { method: e.method, path: p, api: isApi(e), items: [] })
  groups.get(gk).items.push(e)
}

const apiGroups = [...groups.values()].filter(g => g.api)
const statusDist = {}
for (const g of apiGroups) for (const e of g.items) statusDist[e.status] = (statusDist[e.status] || 0) + 1

// 2 异常状态: >=400（204 是录制时的真实响应，仅列信息不计异常）
const badStatus = []
for (const g of apiGroups) for (const e of g.items) if (e.status >= 400) badStatus.push(e)

// 3 变体冲突: 同 method + path 多条目
const variants = apiGroups.filter(g => g.items.length > 1)

// 4 POST 无请求体记录（旧格式数据无法按请求体区分变体）
const noReqBody = apiGroups.flatMap(g => g.items).filter(e => e.method !== 'GET' && !e.reqBody)

// 同签名多响应版本（FIFO 数据）；请求体截断条目
const keyVersions = new Map()
for (const e of entries) keyVersions.set(e.key, (keyVersions.get(e.key) || 0) + 1)
const multiVersion = [...keyVersions.entries()].filter(([, n]) => n > 1)
const truncatedReq = entries.filter(e => e.reqBodyTruncated)

// 5 归档文件缺失
const missingFiles = entries.filter(e => e.file && !existsSync(join(archiveDir, 'files', e.file)))

// 6 采集丢弃记录
const failuresFile = join(archiveDir, 'capture-failures.jsonl')
const fails = existsSync(failuresFile)
  ? readFileSync(failuresFile, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  : []
const failByKind = {}
for (const f of fails) failByKind[f.kind] = (failByKind[f.kind] || 0) + 1

// 7 --extra 对比: 补采里有而归档里没有的端点
let extraMissing = []
if (extraArg && existsSync(extraArg)) {
  const extra = JSON.parse(readFileSync(extraArg, 'utf8'))
  const have = new Set(entries.map(e => e.method + ' ' + pathOf(e.url)))
  const seen = new Set()
  for (const e of extra.entries || []) {
    const gk = e.method + ' ' + pathOf(e.url)
    if (!have.has(gk) && !seen.has(gk)) { seen.add(gk); extraMissing.push(gk) }
  }
}

// 8 回放未命中记录（serve v2 运行时产生）
const unmatchedFile = join(archiveDir, 'unmatched-requests.jsonl')
const unmatched = existsSync(unmatchedFile)
  ? readFileSync(unmatchedFile, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  : []
const unByKind = {}
for (const u of unmatched) unByKind[u.kind] = (unByKind[u.kind] || 0) + 1

const fmtStatuses = g => [...new Set(g.items.map(e => e.status))].join('/')
const md = []
md.push('# API 覆盖率审计报告')
md.push('')
md.push(`- 归档: ${archiveDir}`)
md.push(`- 时间: ${new Date().toISOString()}`)
md.push(`- 总条目 ${entries.length}，API 条目 ${apiGroups.reduce((a, g) => a + g.items.length, 0)}，去重 API 端点 ${apiGroups.length}`)
md.push(`- API 状态分布: ${JSON.stringify(statusDist)}`)
md.push('')
md.push('## 端点清单（API）')
md.push('')
md.push('| 方法 | 路径 | 状态 | 条目数 |')
md.push('|------|------|------|--------|')
for (const g of apiGroups.sort((a, b) => a.path.localeCompare(b.path))) {
  md.push(`| ${g.method} | ${g.path} | ${fmtStatuses(g)} | ${g.items.length} |`)
}
md.push('')
md.push('## 异常状态（>=400）')
md.push('')
if (badStatus.length) {
  md.push('| 方法 | 路径 | 状态 | key |')
  md.push('|------|------|------|-----|')
  for (const e of badStatus) md.push(`| ${e.method} | ${pathOf(e.url)} | ${e.status} | ${e.key} |`)
} else md.push('无')
md.push('')
md.push('## 变体冲突（同端点多条目）')
md.push('')
if (variants.length) {
  md.push('> 修复前采集的数据可能已被覆盖，条目数不代表历史全部变体；修复后按 key（含请求体指纹）区分。')
  md.push('')
  md.push('| 方法 | 路径 | 条目数 | key 列表 |')
  md.push('|------|------|--------|----------|')
  for (const g of variants) md.push(`| ${g.method} | ${g.path} | ${g.items.length} | ${g.items.map(e => e.key).join('<br>') } |`)
} else md.push('无')
md.push('')
md.push('## POST 缺请求体记录')
md.push('')
if (noReqBody.length) {
  md.push('> 这些 POST 录制于 reqBody 字段引入之前（或本就无请求体），回放只能按 URL 匹配，无法区分请求体变体。')
  md.push('')
  md.push('| 方法 | 路径 | key |')
  md.push('|------|------|-----|')
  for (const e of noReqBody) md.push(`| ${e.method} | ${pathOf(e.url)} | ${e.key} |`)
} else md.push('无')
md.push('')
md.push('## 同签名多响应版本（FIFO）')
md.push('')
if (multiVersion.length) {
  md.push('> 同一请求签名录到多个不同响应（不同业务状态），回放按 FIFO 顺序消费，超出后停在最后一版。')
  md.push('')
  md.push('| key | 版本数 |')
  md.push('|-----|--------|')
  for (const [k, n] of multiVersion) md.push(`| ${k} | ${n} |`)
} else md.push('无')
md.push('')
md.push('## 请求体截断（reqBodyTruncated）')
md.push('')
if (truncatedReq.length) {
  md.push('> 请求体超 1MB 仅存前 4KB；回放指纹按完整请求体计算不受影响，但审计时无法核对入库内容。')
  md.push('')
  md.push('| 方法 | 路径 | key |')
  md.push('|------|------|-----|')
  for (const e of truncatedReq) md.push(`| ${e.method} | ${pathOf(e.url)} | ${e.key} |`)
} else md.push('无')
md.push('')
md.push('## 归档文件缺失')
md.push('')
if (missingFiles.length) {
  md.push('| key | 期望文件 |')
  md.push('|-----|----------|')
  for (const e of missingFiles) md.push(`| ${e.key} | files/${e.file} |`)
} else md.push('无')
md.push('')
md.push('## 采集丢弃记录')
md.push('')
if (fails.length) {
  md.push(`来源: capture-failures.jsonl，共 ${fails.length} 条`)
  md.push('')
  md.push('| kind | 数量 |')
  md.push('|------|------|')
  for (const [k, n] of Object.entries(failByKind)) md.push(`| ${k} | ${n} |`)
  md.push('')
  const urls = [...new Set(fails.map(f => f.method + ' ' + f.url))]
  md.push('涉及请求:')
  md.push('')
  for (const u of urls) md.push(`- ${u}`)
} else md.push('无 capture-failures.jsonl（本归档采集时未产生丢弃记录，或采集于该机制引入之前）')
md.push('')
md.push('## 回放未命中记录（serve v2）')
md.push('')
if (unmatched.length) {
  md.push(`来源: unmatched-requests.jsonl，共 ${unmatched.length} 条（回放期真实请求，即补采任务清单）`)
  md.push('')
  md.push('| kind | 数量 |')
  md.push('|------|------|')
  for (const [k, n] of Object.entries(unByKind)) md.push(`| ${k} | ${n} |`)
  md.push('')
  const ulist = [...new Set(unmatched.map(u => (u.kind === 'body-variant-fallback' ? '[回退留痕] ' : '') + u.method + ' ' + u.url + (u.bodyHash ? ' body=' + u.bodyHash : '')))]
  md.push('涉及请求:')
  md.push('')
  for (const u of ulist) md.push(`- ${u}`)
} else md.push('无（未运行过 serve v2 回放，或回放全命中）')
md.push('')
md.push('## 补采对比缺失（--extra）')
md.push('')
if (extraMissing.length) {
  md.push('以下端点存在于补采记录但不在本归档中，需要补录:')
  md.push('')
  for (const gk of extraMissing) md.push(`- ${gk}`)
} else if (extraArg) md.push('补采记录中的端点全部已在归档中')
else md.push('未提供 --extra，跳过（补采后传入补采归档的 index.json 即可对比）')
md.push('')

mkdirSync(resolve(outPath, '..'), { recursive: true })
writeFileSync(outPath, md.join('\n'))

console.log(`端点 ${apiGroups.length} | API条目 ${apiGroups.reduce((a, g) => a + g.items.length, 0)} | 异常状态 ${badStatus.length} | 变体冲突 ${variants.length} | 多版本签名 ${multiVersion.length} | POST缺请求体 ${noReqBody.length} | 截断body ${truncatedReq.length} | 文件缺失 ${missingFiles.length} | 丢弃 ${fails.length} | 回放未命中 ${unmatched.length}${extraArg ? ` | 补采缺失 ${extraMissing.length}` : ''}`)
console.log('报告:', outPath)
