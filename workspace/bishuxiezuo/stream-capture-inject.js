// 流式采集器（由 capture-steps 通过 page.addInitScript 注入，在页面脚本前执行）
// 包装 fetch / EventSource / WebSocket，记录 SSE/NDJSON 帧与双向消息，不改变原应用行为。
// 结果挂在 window.__streamRec，由 capture-steps 结束后取出落盘到 archive/streams/。
;(function () {
  if (window.__streamRec) return
  var recs = (window.__streamRec = [])
  var now = function () { return performance.now() }
  var finish = function (r, term) { if (!r.terminal) r.terminal = term }

  var origFetch = window.fetch
  window.fetch = function () {
    var args = arguments, self = this
    return origFetch.apply(self, args).then(function (res) {
      try {
        var ct = (res.headers && res.headers.get('content-type')) || ''
        if (res.body && (ct.indexOf('event-stream') >= 0 || ct.indexOf('ndjson') >= 0)) {
          var copy = res.clone()
          var isNd = ct.indexOf('ndjson') >= 0
          var r = {
            transport: isNd ? 'fetch-ndjson' : 'fetch-sse',
            url: res.url, status: res.status, contentType: ct, frames: [], terminal: ''
          }
          recs.push(r)
          ;(function () {
            var reader = copy.body.getReader()
            var dec = new TextDecoder()
            var buf = ''
            var t0 = now()
            var sep = isNd ? '\n' : '\n\n'
            var flush = function (final) {
              var i
              while ((i = buf.indexOf(sep)) >= 0) {
                var raw = buf.slice(0, i)
                buf = buf.slice(i + sep.length)
                if (raw.trim()) r.frames.push({ seq: r.frames.length + 1, deltaMs: Math.round(now() - t0), raw: raw })
              }
              if (final && buf.trim()) {
                r.frames.push({ seq: r.frames.length + 1, deltaMs: Math.round(now() - t0), raw: buf })
                buf = ''
              }
            }
            var pump = function () {
              return reader.read().then(function (res2) {
                if (res2.done) { flush(true); finish(r, 'eof'); return }
                buf += dec.decode(res2.value, { stream: true })
                flush(false)
                return pump()
              })
            }
            pump().catch(function (e) { finish(r, 'error:' + String(e).slice(0, 100)) })
          })()
        }
      } catch (e) { /* 采集失败不影响原请求 */ }
      return res
    })
  }

  var OrigES = window.EventSource
  if (OrigES) {
    window.EventSource = function (url, opts) {
      var es = new OrigES(url, opts)
      var r = { transport: 'eventsource', url: String(url), status: 200, contentType: 'text/event-stream', frames: [], terminal: '' }
      recs.push(r)
      var t0 = now()
      es.addEventListener('message', function (e) {
        r.frames.push({ seq: r.frames.length + 1, deltaMs: Math.round(now() - t0), type: 'message', lastEventId: e.lastEventId || '', raw: 'id: ' + (e.lastEventId || '') + '\ndata: ' + e.data })
      })
      es.addEventListener('open', function () { finish(r, 'open') })
      es.addEventListener('error', function () { if (es.readyState === 2) finish(r, 'closed') })
      return es
    }
    window.EventSource.prototype = OrigES.prototype
  }

  var OrigWS = window.WebSocket
  if (OrigWS) {
    window.WebSocket = function (url, protocols) {
      var ws = protocols === undefined ? new OrigWS(url) : new OrigWS(url, protocols)
      var r = { transport: 'websocket', url: String(url), status: 101, contentType: 'websocket', frames: [], terminal: '' }
      recs.push(r)
      var t0 = now()
      var pushFrame = function (type, data) {
        r.frames.push({ seq: r.frames.length + 1, deltaMs: Math.round(now() - t0), type: type, raw: typeof data === 'string' ? data : '[binary]' })
      }
      ws.addEventListener('message', function (e) { pushFrame('recv', e.data) })
      ws.addEventListener('close', function () { finish(r, 'closed') })
      var origSend = ws.send.bind(ws)
      ws.send = function (data) { pushFrame('send', data); return origSend(data) }
      return ws
    }
    window.WebSocket.prototype = OrigWS.prototype
  }
})()
