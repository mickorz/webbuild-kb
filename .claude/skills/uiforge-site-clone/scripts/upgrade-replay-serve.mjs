#!/usr/bin/env node
// 把归档的 serve.mjs 升级为 v2（请求体感知匹配 + 未命中 599/204 可配 + unmatched-requests.jsonl）
// 不修改 thirdparties/ 子模块：v2 是独立文件，升级时写入归档，原文件备份为 serve.mjs.orig
//
// 用法: node .claude/skills/uiforge-site-clone/scripts/upgrade-replay-serve.mjs --archive workspace/<站点>/archive-<名>
// 生效: 升级后重启归档里的 serve.mjs（PORT/REPLAY_MISS 环境变量用法不变）
// 退出码: 0 成功 / 1 归档或原 serve.mjs 不存在
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const argv = process.argv.slice(2)
const val = n => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : null }
const archiveDir = resolve(val('--archive') || '')
const servePath = join(archiveDir, 'serve.mjs')
if (!archiveDir || !existsSync(join(archiveDir, 'index.json')) || !existsSync(servePath)) {
  console.error('用法: node upgrade-replay-serve.mjs --archive <归档目录>（需含 index.json 与 serve.mjs）')
  process.exit(1)
}
const serve = readFileSync(servePath, 'utf8')
if (!serve.includes('UIForge replay server')) { console.error('serve.mjs 不是 UIForge 生成的回放服务器，拒绝覆盖'); process.exit(1) }
const v2 = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'replay-serve-v2.mjs'), 'utf8')
const ver = (v2.match(/serve-upgrade-version: ([\d.]+)/) || [])[1]
if (ver && serve.includes('serve-upgrade-version: ' + ver)) { console.log('已是 v' + ver + '，跳过'); process.exit(0) }
const orig = join(archiveDir, 'serve.mjs.orig')
if (!existsSync(orig)) copyFileSync(servePath, orig)   // 只在首次升级时保留 v1 原件
writeFileSync(servePath, v2)
console.log('serve.mjs 已升级为 v2（v1 备份于 serve.mjs.orig）')
console.log('行为: 带请求体的请求先按指纹匹配变体；未命中 ' + (process.env.REPLAY_MISS || 599) + ' + unmatched-requests.jsonl（REPLAY_MISS=204 回退旧行为）')
console.log('记得重启 serve.mjs 生效')
