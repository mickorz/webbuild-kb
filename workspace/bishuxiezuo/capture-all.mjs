// 多页面捕获 + 合并：对每个 URL 跑一次 uiforge-archive，再把 files/ 与 index.json 合并成一个归档
//
// 用法（在 workspace/<站点>/ 下）:
//   node capture-all.mjs --out ./archive-bishu-v2 --state ./auth.json \
//     --url https://bishuxiezuo.cn/console/console.html \
//     --url https://bishuxiezuo.cn/login.html \
//     --url https://bishuxiezuo.cn/site/home.html
//
// 每个 URL 抓进临时目录，最后一次合并；相同 URL 的条目保留后抓到的版本。
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
const vals = n => argv.reduce((acc, a, i) => (a === n && argv[i + 1] ? [...acc, argv[i + 1]] : acc), [])
const outDir = (vals('--out')[0] || './archive-merged').replace(/^\.\//, '')
const state = vals('--state')[0] || './auth.json'
const urls = vals('--url')
if (!urls.length) { console.error('至少给一个 --url'); process.exit(1) }

const TOOL = fileURLToPath(new URL('../../thirdparties/UIForge/tools/uiforge-archive.mjs', import.meta.url))
const tmpRoot = join(outDir + '.parts')
rmSync(tmpRoot, { recursive: true, force: true })
mkdirSync(tmpRoot, { recursive: true })

const merged = new Map()   // key → entry
const mergedStart = []

// 增量：已有 index.json 时先载入，后续 URL 只是补充（不丢之前抓的条目）
if (existsSync(join(outDir, 'index.json'))) {
  const prev = JSON.parse(readFileSync(join(outDir, 'index.json'), 'utf8'))
  for (const e of prev.entries) merged.set(e.key, e)
  if (prev.start) mergedStart.push(prev.start)
  console.log(`增量模式：已载入 ${prev.entries.length} 条既有响应`)
}

for (const [i, url] of urls.entries()) {
  const part = join(tmpRoot, String(i))
  console.log(`\n[${i + 1}/${urls.length}] ${url}`)
  const args = [TOOL, url, '--out-dir', part, '--explore']
  if (existsSync(state)) args.push('--storage-state', state)
  // NODE_PATH 让 UIForge 工具在站点目录下也能解析 playwright
  execFileSync(process.execPath, args, {
    stdio: 'inherit',
    env: { ...process.env, NODE_PATH: process.env.NODE_PATH || '' },
  })
  const idx = JSON.parse(readFileSync(join(part, 'index.json'), 'utf8'))
  mergedStart.push(idx.start)
  for (const e of idx.entries) merged.set(e.key, e)
  // 合并 files/
  const srcFiles = join(part, 'files')
  if (existsSync(srcFiles)) cpSync(srcFiles, join(outDir, 'files'), { recursive: true })
  // 复用第一次生成的 serve.mjs
  if (!existsSync(join(outDir, 'serve.mjs'))) cpSync(join(part, 'serve.mjs'), join(outDir, 'serve.mjs'))
}

const entries = [...merged.values()]
const first = JSON.parse(readFileSync(join(tmpRoot, '0', 'index.json'), 'utf8'))
const prevMeta = existsSync(join(outDir, 'index.json')) ? JSON.parse(readFileSync(join(outDir, 'index.json'), 'utf8')) : null
const base = prevMeta && prevMeta.startNorm ? prevMeta : first
writeFileSync(join(outDir, 'index.json'), JSON.stringify({
  start: base.start,
  startNorm: base.startNorm,
  origin: base.origin,
  count: entries.length,
  entries,
}, null, 0))
rmSync(tmpRoot, { recursive: true, force: true })

const host = (() => { try { return new URL(base.start).hostname } catch { return 'site' } })()
const starts = [...new Set(mergedStart)]
writeFileSync(join(outDir, 'README.md'), `# UIForge behavior archive — ${host}\n\n多页面合并归档，共 ${entries.length} 条响应。覆盖入口：\n${starts.map(u => `- ${u}`).join('\n')}\n\n\`\`\`bash\nnode serve.mjs\n\`\`\`\n\n镜像在 \`files/\` 下，按真实 URL 路径存放，可直接阅读修改。\`index.json\` 是请求 → 文件映射。\n`)
console.log(`\n合并完成: ${entries.length} 条响应 → ${outDir}`)
