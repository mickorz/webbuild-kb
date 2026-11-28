// 冒烟服务器：验证 capture-steps 修复（body 变体保留 / failures 落盘 / reqBody 入库）
import http from 'node:http'

const BIG = 'x'.repeat(13 * 1024 * 1024) // 超过 12MB 上限，应触发 response-body-too-large
const page = `<!doctype html><html><body>
<button id="goA">A</button><button id="goB">B</button>
<script>
document.getElementById('goA').onclick = () => fetch('/api/echo', { method: 'POST', body: '{"k":"A"}' })
document.getElementById('goB').onclick = () => fetch('/api/echo', { method: 'POST', body: '{"k":"B"}' })
fetch('/api/big')
</script></body></html>`

http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(page) }
  if (req.url === '/api/echo' && req.method === 'POST') {
    let b = ''
    req.on('data', c => b += c)
    req.on('end', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ got: b })) })
    return
  }
  if (req.url === '/api/big') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(BIG) }
  res.writeHead(404); res.end()
}).listen(8931, '127.0.0.1', () => console.log('smoke server on 8931'))
