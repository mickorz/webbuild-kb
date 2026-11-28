// 流式采集器（由 capture-steps 通过 page.addInitScript 注入，在页面脚本前执行）
// 包装 fetch / EventSource / WebSocket，记录 SSE/NDJSON 帧与双向消息，不改变原应用行为。
// 分帧兼容 LF / CRLF；UTF-8 跨块用 TextDecoder(stream:true) 处理；EventSource 记录所有事件类型；
// WebSocket 二进制帧以 base64 保留真实内容。
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
            var flush = function (final) {
              // 分帧兼容 \r\n\r\n 与 \n\n
              var re = isNd ? /\r?\n/ : /\r?\n\r?\n/
              var m
              while ((m = re.exec(buf))) {
                var raw = buf.slice(0, m.index)
                buf = buf.slice(m.index + m[0].length)
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
      // 记录所有事件类型（含自定义事件）：包装 addEventListener
      var origAdd = es.addEventListener.bind(es)
      es.addEventListener = function (type, fn, o) {
        return origAdd(type, function (e) {
          var data = e && typeof e.data === 'string' ? e.data : ''
          r.frames.push({
            seq: r.frames.length + 1, deltaMs: Math.round(now() - t0),
            type: type, lastEventId: (e && e.lastEventId) || '',
            raw: 'id: ' + ((e && e.lastEventId) || '') + '\nevent: ' + type + '\ndata: ' + data
          })
          return fn.call(this, e)
        }, o)
      }
      origAdd('open', function () { if (!r.terminal) r.terminal = 'open' })
      origAdd('error', function () { if (es.readyState === 2) finish(r, 'closed') })
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
        var raw
        if (typeof data === 'string') raw = data
        else if (data instanceof ArrayBuffer || (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(data))) {
          // 二进制帧：base64 保留真实内容（不用 [binary] 占位）
          try {
            var bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            var bin = ''
            for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
            raw = 'base64:' + btoa(bin)
          } catch (e) { raw = 'binary-unreadable' }
        } else if (data && typeof data.arrayBuffer === 'function') {
          // Blob（WebSocket binaryType 默认 blob）：读字节并 base64 保留真实内容
          return data.arrayBuffer().then(function (buf) {
            var bytes = new Uint8Array(buf)
            var bin = ''
            for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
            r.frames.push({ seq: r.frames.length + 1, deltaMs: Math.round(now() - t0), type: type, raw: 'base64:' + btoa(bin) })
          })
        } else if (data && typeof data.text === 'function') { return data.text().then(function (t) { pushFrame(type, t) }) }
        else raw = String(data)
        r.frames.push({ seq: r.frames.length + 1, deltaMs: Math.round(now() - t0), type: type, raw: raw })
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
