// 读取 cards.json，按卡片家族分组成展示页（cards.html）
import { readFileSync, writeFileSync } from 'node:fs'

const DIR = './archive-bishu/files/_gallery'
const items = JSON.parse(readFileSync(`${DIR}/cards.json`, 'utf8'))

// 类名 → 家族 / 中文名
const FAMILY = [
  { key: 'c-structured-list', family: '结构化键值列表', name: v => v.includes('kv') ? (v.includes('layout-grid') ? '键值 · 网格（列数自适应）' : '键值 · 单列堆叠') : (v.includes('editing') ? '列表 · 编辑中' : '列表 · 堆叠可增删'), note: '最常用于角色/世界观的结构化字段' },
  { key: 'c-titled-text', family: '标题正文', name: v => v.includes('c-content-toolbar-owner') ? '带工具条 · 可编辑' : '纯展示 · 无工具条', note: '小标题 + 段落正文' },
  { key: 'c-character-identity-surface', family: '角色身份卡', name: () => '姓名 + 身份 + 基本信息条', note: '角色表头部（头像图未随镜像抓取，属离线预期）' },
  { key: 'c-character-relationships', family: '角色关系卡', name: () => '关系列表', note: '关系网络 · 敌对/盟友' },
  { key: 'ck-depth', family: '深化阅读卡', name: () => 'col 深层维度 · 可展开', note: 'card-reading 阅读模式' },
  { key: 'ck-voice', family: '角色声音卡', name: () => '台词/语气 · 可展开', note: 'card-reading 阅读模式' },
  { key: 'ck-belief', family: '信念生态卡', name: () => '信念与动机', note: '角色深层维度' },
  { key: 'c-relationship-map', family: '关系图谱', name: () => '图形化节点图', note: '势力/人物关系可视化' },
]

const classify = it => {
  const hit = FAMILY.find(f => it.clsKey.includes(f.key))
  if (!hit) return { family: '其他', name: it.clsKey.split(' ').filter(c => /^c-|^ck-|^cr-/.test(c)).slice(-1)[0] || it.bodyKind, note: '' }
  return { family: hit.family, name: hit.name(it.clsKey), note: hit.note }
}

const enriched = items.map(it => ({ ...it, ...classify(it) }))

// 分组（保持首次出现顺序）
const groups = []
for (const it of enriched) {
  let g = groups.find(x => x.family === it.family)
  if (!g) { g = { family: it.family, note: it.note, items: [] }; groups.push(g) }
  g.items.push(it)
}

const nav = groups.map((g, i) => `<a href="#g${i + 1}">${g.family} <b>${g.items.length}</b></a>`).join('\n')

const body = groups.map((g, gi) => `
<h2 class="g-family" id="g${gi + 1}">${g.family} <span class="g-count">${g.items.length} 种</span>${g.note ? `<em>${g.note}</em>` : ''}</h2>
${g.items.map(it => `
  <section class="g-item">
    <div class="g-meta">
      <span class="g-name">${it.name}</span>
      ${it.editable ? '<span class="g-tag g-edit">可直接编辑</span>' : '<span class="g-tag">只读</span>'}
      ${it.actions.includes('primary') ? '<span class="g-tag g-edit">含 完成/AI 改写</span>' : ''}
      <span class="g-screen">${it.screen}</span>
    </div>
    <details class="g-cls"><summary>类名</summary><code>${it.clsKey}</code></details>
    <div class="g-preview">${it.html}</div>
  </section>`).join('\n')}
`).join('\n')

const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light" data-site="cn">
<head>
<meta charset="UTF-8">
<title>内容卡片形态总览 · ${items.length} 种</title>
<link rel="stylesheet" href="../console/console.css">
<style>
  body { background: #f6f3ec; margin: 0; padding: 40px 56px 90px; font-family: system-ui, -apple-system, "Noto Sans SC", sans-serif; }
  .g-head h1 { font-size: 27px; margin: 0 0 10px; }
  .g-head p { color: #6b6558; margin: 0 0 22px; font-size: 13.5px; line-height: 1.75; max-width: 900px; }
  .g-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 34px; }
  .g-nav a { font-size: 12.5px; padding: 6px 12px; border: 1px solid #d9d3c4; border-radius: 999px; color: #4a4436; text-decoration: none; background: #fffdf8; }
  .g-nav a:hover { border-color: #b8863b; color: #8a5f1d; }
  .g-nav b { color: #b8863b; }
  .g-family { font-size: 17px; margin: 44px 0 6px; padding-bottom: 8px; border-bottom: 1px solid #e2dbcb; scroll-margin-top: 20px; }
  .g-count { font-size: 12px; color: #b8863b; font-weight: 500; margin-left: 6px; }
  .g-family em { display: block; font-size: 12px; color: #9a9280; font-style: normal; margin-top: 6px; font-weight: 400; }
  .g-item { margin: 22px 0 0; }
  .g-meta { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: #6b6558; margin-bottom: 8px; flex-wrap: wrap; }
  .g-name { font-weight: 600; color: #3f3a2e; }
  .g-tag { background: #eef1ea; color: #4e5a44; padding: 2px 8px; border-radius: 4px; font-size: 11.5px; }
  .g-edit { background: #f6ecdb; color: #8a5f1d; }
  .g-screen { margin-left: auto; color: #a9a190; font-size: 11.5px; }
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
  <p>离线回放镜像中共复刻 <strong>${items.length}</strong> 种内容卡片形态，归为 <strong>${groups.length}</strong> 个家族。判定依据是「完整类名组合 + 工具条动作集合」；下方每张卡片都是从回放 DOM 里取出的真实 HTML，样式直接引用镜像内的 <code>console.css</code>。</p>
</div>
<div class="g-nav">${nav}</div>
${body}
</body>
</html>`

writeFileSync(`${DIR}/cards.html`, html)
console.log(`已生成展示页：${items.length} 种 / ${groups.length} 个家族`)
groups.forEach(g => console.log(`  ${g.family}: ${g.items.length} 种 —— ${g.items.map(i => i.name).join('、')}`))
