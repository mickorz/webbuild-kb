(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AssistantUploadCore = api;
})(typeof globalThis === "object" ? globalThis : this, function () {
  const READABLE = { ok: true, ready: true };
  const BINARY = { unsupported: true, invalid: true, encrypted: true };

  function workspaceCore(explicit) {
    if (explicit) return explicit;
    if (typeof window !== "undefined" && window.AssistantWorkspaceCore) return window.AssistantWorkspaceCore;
    if (typeof globalThis !== "undefined" && globalThis.AssistantWorkspaceCore) return globalThis.AssistantWorkspaceCore;
    return null;
  }

  function uploadCopy(lang) {
    const en = lang === "en";
    return en ? {
      upload: "Upload",
      limit: "Each file must be 8 MiB or smaller.",
      queued: "Waiting to upload",
      checking: "Checking file",
      uploading: "Uploading",
      saved: "Saved",
      conflict: "A file with this name already exists. It was not overwritten.",
      large: "Over 8 MiB. Not uploaded.",
      capacity: "Storage is full. Delete unused files or increase your allowance.",
      invalid: "This file name cannot be used.",
      forbidden: "You do not have permission to upload.",
      unavailable: "Workspace is temporarily unavailable.",
      uncertain: "The result is not confirmed. Retry continues the same upload.",
      removedUncertain: "Removed from this list. It is not confirmed whether the file was saved, and no saved file was deleted.",
      truncated: "Only the beginning can be read. The original file can be downloaded.",
      binary: "Text cannot be extracted. The original file can be downloaded.",
      kept: "Whether text can be read is not confirmed. The original file can be downloaded.",
      retry: "Retry",
      copy: "Save a copy",
      skip: "Skip",
      remove: "Remove",
      dismiss: "Dismiss",
      cite: "Use in next message",
      uncite: "Remove from next message",
      download: "Download",
      downloadFailed: "The download did not finish. Try again.",
      drop: "Release to upload into Materials.",
      citeLimit: "This message is too long. Reduce its text or references."
    } : {
      upload: "上传资料",
      limit: "每个文件不超过 8 MiB。",
      queued: "等待上传",
      checking: "正在检查文件",
      uploading: "正在上传",
      saved: "已保存",
      conflict: "已有同名资料，未覆盖。",
      large: "超过 8 MiB，未上传。",
      capacity: "资料空间已满，请删除不用的文件或提高配额。",
      invalid: "这个文件名无法使用。",
      forbidden: "暂无权限上传。",
      unavailable: "工作区暂时不可用。",
      uncertain: "结果未确认。重试会继续同一次上传。",
      removedUncertain: "已从列表移除。无法确认这份资料是否已经保存，没有删除已保存的文件。",
      truncated: "只读到开头，原文件可下载。",
      binary: "不能提取文字，原文件可下载。",
      kept: "文字是否可读尚未确认，原文件可下载。",
      retry: "重试",
      copy: "保存副本",
      skip: "跳过",
      remove: "移除",
      dismiss: "收起",
      cite: "用于下一条",
      uncite: "取消附加",
      download: "下载",
      downloadFailed: "下载没有完成，请再试一次。",
      drop: "松开后上传到资料。",
      citeLimit: "当前消息过长，请减少文字或引用后重试。"
    };
  }

  function statusText(item, copy) {
    const source = copy || uploadCopy("zh");
    if (!item) return "";
    if (item.status === "preparing" || item.status === "queued") return source.queued;
    if (item.status === "checking") return source.checking;
    if (item.status === "uploading") return source.uploading;
    if (item.status === "conflict") return source.conflict;
    if (item.status === "uncertain") return source.uncertain;
    if (item.status === "failed") return source[item.reason] || source.unavailable;
    if (item.status === "saved") {
      const hint = parseHint(item.parseStatus, source);
      if (!hint) return source.saved;
      return source.saved + (langIsEnglish(source) ? ". " : "。") + hint;
    }
    return "";
  }

  function parseHint(status, copy) {
    const source = copy || uploadCopy("zh");
    if (!status || READABLE[status]) return "";
    if (status === "truncated") return source.truncated;
    if (BINARY[status]) return source.binary;
    return source.kept;
  }

  function safeName(name) {
    const leaf = String(name || "").split(/[/\\]/).pop().replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (!leaf || leaf === "." || leaf === "..") return "";
    return leaf.slice(0, 180);
  }

  function materialPath(name, workspace) {
    const leaf = safeName(name);
    const core = workspaceCore(workspace);
    if (!leaf || !core || typeof core.validPath !== "function") return "";
    const path = "materials/" + leaf;
    return core.validPath(path) ? path : "";
  }

  function splitLeaf(path) {
    const leaf = String(path || "").slice("materials/".length);
    const dot = leaf.lastIndexOf(".");
    const ext = dot > 0 ? leaf.slice(dot) : "";
    const stem = dot > 0 ? leaf.slice(0, dot) : leaf;
    const numbered = /^(.*)-(\d+)$/.exec(stem);
    if (numbered && Number(numbered[2]) >= 2) {
      return { stem: numbered[1], ext: ext, start: Number(numbered[2]) + 1 };
    }
    return { stem: stem, ext: ext, start: 2 };
  }

  function copyPath(path, taken, workspace) {
    const core = workspaceCore(workspace);
    if (!core || String(path || "").indexOf("materials/") !== 0) return "";
    const parts = splitLeaf(path);
    const used = taken || new Set();
    for (let number = parts.start; number < 100; number += 1) {
      const candidate = "materials/" + parts.stem + "-" + number + parts.ext;
      if (core.validPath(candidate) && !used.has(candidate)) return candidate;
    }
    return "";
  }

  function nextMaterialPath(name, taken, workspace) {
    const base = materialPath(name, workspace);
    if (!base) return "";
    if (!taken.has(base)) return base;
    return copyPath(base, taken, workspace);
  }

  function validVersion(version) {
    return typeof version === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(version);
  }

  function safeStatus(status) {
    const value = typeof status === "string" ? status.trim() : "";
    if (!value || value.length > 40 || /[\u0000-\u001f\u007f]/.test(value)) return "";
    return value;
  }

  function locatorOf(file) {
    const version = file && typeof file.version === "string" ? file.version : "";
    if (!validVersion(version)) return null;
    const core = workspaceCore(null);
    const rawId = file && file.file_id;
    if (rawId != null && rawId !== "") {
      if (!core || typeof core.validFileId !== "function" || !core.validFileId(rawId)) return null;
      const path = typeof file.path === "string" ? file.path : "";
      if (path && typeof core.validPath === "function" && !core.validPath(path)) return null;
      const name = typeof core.displayName === "function" ? core.displayName(file) : "";
      if (!name) return null;
      const item = { file_id: rawId, version: version, name_snapshot: name };
      if (path) item.path = path;
      if (typeof file.content_type === "string") item.content_type = file.content_type;
      const status = safeStatus(file.parse_status || file.parseStatus);
      if (status) item.parse_status = status;
      if (typeof core.validKind === "function" && core.validKind(file.kind)) item.kind = file.kind;
      return item;
    }
    const path = file && typeof file.path === "string" ? file.path : "";
    if (path.indexOf("materials/") !== 0) return null;
    if (core && typeof core.validPath === "function" && !core.validPath(path)) return null;
    const item = { path: path, version: version };
    const status = safeStatus(file.parse_status || file.parseStatus);
    if (status) item.parse_status = status;
    return item;
  }

  function sameLocator(left, right) {
    if (!left || !right || left.version !== right.version) return false;
    if (left.file_id && right.file_id) return left.file_id === right.file_id;
    if (left.file_id || right.file_id) return !!(left.path && right.path && left.path === right.path);
    return left.path === right.path;
  }

  function normalizeWorkspaceFiles(files) {
    const out = [];
    const list = Array.isArray(files) ? files : [];
    for (let index = 0; index < list.length; index += 1) {
      const item = locatorOf(list[index]);
      if (!item) continue;
      const slot = out.findIndex((existing) => sameLocator(existing, item));
      if (slot === -1) {
        out.push(item);
        continue;
      }
      if (!out[slot].file_id && item.file_id) {
        out[slot] = Object.assign({}, item, {
          name_snapshot: out[slot].name_snapshot || item.name_snapshot,
          parse_status: out[slot].parse_status || item.parse_status
        });
      }
    }
    return out;
  }

  function wireWorkspaceFiles(files) {
    return normalizeWorkspaceFiles(files).map((file) => {
      if (file.file_id) {
        const item = { file_id: file.file_id, version: file.version, name_snapshot: file.name_snapshot };
        if (file.path) item.path = file.path;
        return item;
      }
      return { path: file.path, version: file.version };
    });
  }

  function sameWorkspaceFiles(left, right) {
    return JSON.stringify(wireWorkspaceFiles(left)) === JSON.stringify(wireWorkspaceFiles(right));
  }

  function subtractWorkspaceFiles(current, sent) {
    const remove = normalizeWorkspaceFiles(sent);
    return normalizeWorkspaceFiles(current).filter((file) => !remove.some((item) => sameLocator(file, item)));
  }

  function toggleCitation(current, file) {
    const next = normalizeWorkspaceFiles(current);
    const added = normalizeWorkspaceFiles([file]);
    if (!added.length) return { files: next, accepted: false, reason: "invalid" };
    const target = added[0];
    const exists = next.some((item) => sameLocator(item, target));
    if (exists) {
      return {
        files: next.filter((item) => !sameLocator(item, target)),
        accepted: true,
        reason: ""
      };
    }
    return { files: next.concat([target]), accepted: true, reason: "" };
  }

  function requestKeyOf(message) {
    if (!message) return "";
    const json = message.content_json;
    if (json && json.client_request_key) return String(json.client_request_key);
    const id = message.id ? String(message.id) : "";
    return id.indexOf("local-") === 0 ? id.slice("local-".length) : "";
  }

  function langIsEnglish(copy) {
    return !!(copy && copy.upload === "Upload");
  }

  function messageFiles(message) {
    if (!message || (message.role && message.role !== "user")) return [];
    const json = message.content_json;
    const server = json && Array.isArray(json.workspace_files) ? normalizeWorkspaceFiles(json.workspace_files) : [];
    if (server.length) return server;
    return normalizeWorkspaceFiles(message && message.workspace_files);
  }

  function retainCitedMessages(current, next) {
    const sources = new Map();
    (Array.isArray(current) ? current : []).forEach((message) => {
      const files = messageFiles(message);
      const key = requestKeyOf(message);
      if (key && files.length) sources.set(key, files);
    });
    return (Array.isArray(next) ? next : []).map((message) => {
      if (!message || message.role !== "user") return message;
      const json = message.content_json;
      if (json && Array.isArray(json.workspace_files) && normalizeWorkspaceFiles(json.workspace_files).length) return message;
      const files = sources.get(requestKeyOf(message));
      if (!files) return message;
      return Object.assign({}, message, { workspace_files: files });
    });
  }

  function isFileDrag(dataTransfer) {
    const types = dataTransfer && dataTransfer.types;
    if (!types) return false;
    for (let index = 0; index < types.length; index += 1) {
      if (types[index] === "Files") return true;
    }
    return false;
  }

  function selectedFiles(event) {
    const target = event && event.target;
    const files = Array.from(target && target.files || []).filter(Boolean);
    if (target) {
      try { target.value = ""; } catch (ignored) {}
    }
    return files;
  }

  function createDropHandlers(onFiles) {
    let depth = 0;
    const subscribers = new Set();
    function publish(dragging) {
      subscribers.forEach((fn) => fn(dragging));
    }
    return {
      subscribe(fn) {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      },
      onDragEnter(event) {
        if (!isFileDrag(event && event.dataTransfer)) return;
        event.preventDefault();
        depth += 1;
        publish(true);
      },
      onDragOver(event) {
        if (!isFileDrag(event && event.dataTransfer)) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      },
      onDragLeave() {
        if (depth === 0) return;
        depth -= 1;
        if (depth === 0) publish(false);
      },
      onDrop(event) {
        const transfer = event && event.dataTransfer;
        if (!isFileDrag(transfer)) return false;
        event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
        depth = 0;
        publish(false);
        if (onFiles) return onFiles(transfer.files);
        return true;
      }
    };
  }

  function classifyPut(error, workspace) {
    const core = workspaceCore(workspace);
    const kind = core && typeof core.failure === "function" ? core.failure(error) : "unavailable";
    if (kind === "conflict") return { status: "conflict", reason: "conflict" };
    if (kind === "large" || kind === "invalid" || kind === "forbidden" || kind === "capacity") return { status: "failed", reason: kind };
    return { status: "uncertain", reason: "uncertain" };
  }

  function publishItem(item) {
    const saved = item.result;
    return {
      id: item.id,
      name: saved && saved.name_snapshot ? saved.name_snapshot : item.name,
      path: item.path,
      file_id: saved && saved.file_id || "",
      name_snapshot: saved && saved.name_snapshot || "",
      kind: saved && saved.kind || "",
      status: item.status,
      reason: item.reason || "",
      version: saved ? saved.version : "",
      parseStatus: saved ? saved.parse_status : "",
      size: item.size,
      retryable: (item.status === "failed" || item.status === "uncertain") && !!(item.bytes || item.file),
      citable: item.status === "saved" && !!(saved && saved.version && (saved.file_id || saved.path))
    };
  }

  function acceptWrite(result, path, item) {
    if (!result || result.committed !== true || !result.file) return null;
    const file = result.file;
    const core = workspaceCore(null);
    if (typeof file.path !== "string" || file.path.indexOf("materials/") !== 0 ||
        (core && !core.validPath(file.path)) || !validVersion(file.version)) return null;
    if (file.file_id != null && file.file_id !== "" && (!core || !core.validFileId(file.file_id))) return null;
    if (file.kind && (!core || !core.validKind(file.kind) || file.kind !== core.kindFromPath(file.path))) return null;
    if (file.path !== path) {
      if (!item || !(result.deduplicated === true || item.renameOnConflict)) return null;
      if (file.sha256 !== item.sha256 || file.size !== item.size) return null;
      if (result.deduplicated !== true && file.path.split("/").slice(0, -1).join("/") !== path.split("/").slice(0, -1).join("/")) return null;
    }
    if (item && file.sha256 && (file.sha256 !== item.sha256 || file.size !== item.size)) return null;
    const saved = {
      path: file.path,
      version: String(file.version),
      parse_status: safeStatus(file.parse_status)
    };
    if (file.file_id) {
      saved.file_id = file.file_id;
      saved.name_snapshot = (core && core.safeLeaf(file.name)) || file.path.split("/").pop();
      saved.kind = file.kind || (core && core.kindFromPath(file.path)) || "";
    }
    return saved;
  }

  async function digestHex(bytes) {
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function createController(options) {
    const opts = options || {};
    const workspace = opts.workspace || null;
    const queues = new Map();
    let visibleAccount = null;
    let generation = 0;
    let tail = Promise.resolve();
    let intake = Promise.resolve();
    let sequence = 0;
    const inflight = new Set();

    function stopInflight() {
      inflight.forEach((controller) => controller.abort());
      inflight.clear();
    }

    function accountQueue(accountId) {
      if (!queues.has(accountId)) queues.set(accountId, []);
      return queues.get(accountId);
    }

    function notify() {
      if (typeof opts.onChange !== "function" || !visibleAccount) return;
      opts.onChange(accountQueue(visibleAccount).map(publishItem));
    }

    function bindAccount(accountId) {
      const next = accountId == null || accountId === "" ? null : String(accountId);
      if (next === visibleAccount) return;
      stopInflight();
      if (visibleAccount) accountQueue(visibleAccount).forEach((item) => {
        if (item.status === "preparing") item.status = "queued";
      });
      visibleAccount = next;
      generation += 1;
      notify();
      if (next) schedule();
    }

    function owns(item) {
      return accountQueue(item.accountId).indexOf(item) !== -1;
    }

    function visible(item, token) {
      return token === generation && item.accountId === visibleAccount && owns(item);
    }

    function finish(item, token) {
      if (item.accountId === visibleAccount && token === generation) notify();
    }

    function park(item, sent) {
      if (!owns(item) || (item.status !== "uploading" && item.status !== "checking")) return;
      if (sent) {
        item.status = "uncertain";
        item.reason = "uncertain";
      } else {
        item.status = "queued";
        item.reason = "";
      }
    }

    async function runItem(item, token) {
      let sent = false;
      const http = new AbortController();
      item.http = http;
      inflight.add(http);
      try {
        if (!visible(item, token)) return;
        item.status = "checking";
        item.reason = "";
        finish(item, token);
        const status = await opts.request("status", null, { signal: http.signal });
        if (!visible(item, token)) { park(item, false); return; }
        if (!status || status.available !== true) {
          item.status = "failed";
          item.reason = "unavailable";
          finish(item, token);
          return;
        }
        if (!item.bytes) item.bytes = await item.file.arrayBuffer();
        if (!visible(item, token)) { park(item, false); return; }
        if (item.bytes.byteLength > workspaceCore(workspace).MAX_UPLOAD) {
          item.status = "failed";
          item.reason = "large";
          item.bytes = null;
          finish(item, token);
          return;
        }
        if (!item.sha256) item.sha256 = await digestHex(item.bytes);
        item.size = item.bytes.byteLength;
        if (!visible(item, token)) { park(item, false); return; }
        let result;
        // Once bytes have been sent, retries must preserve the same destination
        // and idempotency key instead of reserving another copy.
        if (!item.sent) {
          const checked = await opts.request("upload-check", {
            path: item.path, content_sha256: item.sha256, content_size: item.size,
            rename_on_conflict: !!item.renameOnConflict
          }, { signal: http.signal });
          if (!visible(item, token)) { park(item, false); return; }
          if (checked && checked.status === "duplicate") {
            if (!checked.file || checked.file.sha256 !== item.sha256 || checked.file.size !== item.size) throw new Error("Invalid duplicate receipt");
            result = { committed: true, deduplicated: true, file: checked.file };
          } else if (checked && checked.status === "conflict") {
            item.status = "conflict";
            item.reason = "conflict";
            finish(item, token);
            return;
          } else if (checked && checked.status === "ready") {
            if (!workspaceCore(workspace).validPath(checked.path) || !checked.path.startsWith("materials/") ||
                (checked.path !== item.path && !item.renameOnConflict) ||
                checked.path.split("/").slice(0, -1).join("/") !== item.path.split("/").slice(0, -1).join("/")) throw new Error("Invalid upload destination");
            item.path = checked.path;
          } else throw new Error("Invalid upload check");
        }
        if (!result) {
          sent = true;
          item.sent = true;
          item.status = "uploading";
          finish(item, token);
          result = await opts.request("file", {
            path: item.path,
            idempotency_key: item.key,
            content_sha256: item.sha256,
            rename_on_conflict: !!item.renameOnConflict
          }, {
            method: "PUT",
            body: item.bytes,
            headers: { "Content-Type": item.contentType },
            signal: http.signal
          });
        }
        if (!visible(item, token)) { park(item, sent); return; }
        const saved = acceptWrite(result, item.path, item);
        if (!saved) {
          item.status = sent ? "uncertain" : "failed";
          item.reason = sent ? "uncertain" : "unavailable";
          finish(item, token);
          return;
        }
        item.status = "saved";
        item.reason = "";
        item.result = saved;
        item.path = saved.path;
        item.name = saved.name_snapshot || saved.path.split("/").pop();
        item.bytes = null;
        item.file = null;
        finish(item, token);
        if (typeof opts.onSaved === "function" && item.accountId === visibleAccount) opts.onSaved(saved);
      } catch (error) {
        // A UI refresh failure cannot undo the server's committed receipt.
        if (item.status === "saved") return;
        if (!visible(item, token)) { park(item, sent); return; }
        if (!sent) {
          const kind = workspaceCore(workspace).failure(error);
          item.status = "failed";
          item.reason = kind === "forbidden" ? "forbidden" : "unavailable";
        } else {
          const outcome = classifyPut(error, workspace);
          item.status = outcome.status;
          item.reason = outcome.reason;
        }
        finish(item, token);
      } finally {
        inflight.delete(http);
        if (item.http === http) item.http = null;
      }
    }

    function schedule() {
      const token = generation;
      const run = tail.then(async () => {
        if (!visibleAccount || token !== generation) return;
        let item = accountQueue(visibleAccount).find((entry) => entry.status === "queued");
        while (item && token === generation && item.accountId === visibleAccount) {
          await runItem(item, token);
          if (!visibleAccount || token !== generation) return;
          item = accountQueue(visibleAccount).find((entry) => entry.status === "queued");
        }
      });
      tail = run.catch(() => {});
      return run;
    }

    function enqueue(fileList) {
      const accountId = visibleAccount;
      const token = generation;
      const core = workspaceCore(workspace);
      if (!accountId || !core || typeof opts.request !== "function" || typeof opts.newKey !== "function") {
        return Promise.resolve([]);
      }
      const batch = [];
      const queue = accountQueue(accountId);
      for (const file of Array.from(fileList || []).filter(Boolean)) {
        if (opts.canEnqueue && !opts.canEnqueue(queue.map(publishItem))) {
          if (opts.onLimit) opts.onLimit();
          break;
        }
        const path = materialPath(file.name, workspace);
        const size = Number(file.size || 0);
        const reason = !path ? "invalid" : size > core.MAX_UPLOAD ? "large" : "";
        const item = {
          id: "upload-" + (++sequence), accountId, path,
          name: path ? path.split("/").pop() : safeName(file.name) || "file",
          size, contentType: file.type || "application/octet-stream",
          status: reason ? "failed" : "preparing", reason,
          key: opts.newKey(), file: reason ? null : file, bytes: null, result: null
        };
        queue.push(item);
        if (!reason) batch.push(item);
      }
      notify();
      const prepared = intake.then(async () => {
        for (const item of batch) {
          if (!visible(item, token)) continue;
          try {
            const bytes = await item.file.arrayBuffer();
            if (!visible(item, token)) continue;
            if (bytes.byteLength > core.MAX_UPLOAD) throw Object.assign(new Error("large"), { local: "large" });
            const sha256 = await digestHex(bytes);
            const signature = sha256 + "\0" + bytes.byteLength;
            if (!visible(item, token)) continue;
            const existing = accountQueue(accountId).find((entry) => entry !== item && entry.signature === signature);
            if (existing) {
              if (existing.status === "failed" || existing.status === "uncertain") {
                existing.status = "queued";
                existing.reason = "";
                existing.bytes = bytes;
              }
              remove(item.id);
              continue;
            }
            item.bytes = bytes;
            item.signature = signature;
            item.sha256 = sha256;
            item.status = "queued";
          } catch (error) {
            if (!visible(item, token)) continue;
            item.status = "failed";
            item.reason = error && error.local === "large" ? "large" : "invalid";
            item.file = null;
          }
          finish(item, token);
        }
      });
      intake = prepared.catch(() => {});
      return prepared.then(() => token === generation ? schedule() : null)
        .then(() => snapshot(accountId));
    }

    function find(id) {
      if (!visibleAccount) return null;
      return accountQueue(visibleAccount).find((item) => item.id === id) || null;
    }

    function retry(id) {
      const item = find(id);
      if (!item || (!item.bytes && !item.file)) return null;
      if (!item || item.status === "uploading" || item.status === "saved" || item.status === "conflict") return null;
      if (item.status !== "failed" && item.status !== "uncertain") return null;
      item.status = "queued";
      item.reason = "";
      notify();
      return schedule();
    }

    function saveCopy(id) {
      const item = find(id);
      if (!item || item.status !== "conflict") return null;
      item.renameOnConflict = true;
      item.sent = false;
      item.key = opts.newKey();
      item.status = "queued";
      item.reason = "";
      item.result = null;
      notify();
      return schedule();
    }

    function skip(id) {
      const item = find(id);
      if (!item || item.status !== "conflict") return { removed: false, uncertain: false };
      const queue = accountQueue(visibleAccount);
      queues.set(visibleAccount, queue.filter((entry) => entry !== item));
      notify();
      return { removed: true, uncertain: false };
    }

    function remove(id) {
      const item = find(id);
      if (!item) return { removed: false, uncertain: false };
      const uncertain = item.status === "uncertain" || item.status === "uploading";
      if (item.http) item.http.abort();
      const queue = accountQueue(visibleAccount);
      queues.set(visibleAccount, queue.filter((entry) => entry !== item));
      notify();
      return { removed: true, uncertain: uncertain };
    }

    function reset() {
      stopInflight();
      generation += 1;
      if (visibleAccount) queues.set(visibleAccount, []);
      // Late preparation/request completion remains guarded by generation and ownership.
      intake = Promise.resolve();
      tail = Promise.resolve();
      notify();
    }

    function cancelUnfinished() {
      stopInflight();
      generation += 1;
      let cancelled = 0, uncertain = 0;
      if (visibleAccount) queues.set(visibleAccount, accountQueue(visibleAccount).filter((item) => {
        if (item.status === "saved") return true;
        cancelled += 1;
        // Cancelling local waiting does not prove that sent bytes were not
        // saved. Keep their bytes, destination and key for explicit recovery.
        if (item.sent || item.status === "uncertain") {
          item.status = "uncertain"; item.reason = "uncertain"; uncertain += 1;
          return true;
        }
        return false;
      }));
      intake = Promise.resolve(); tail = Promise.resolve();
      notify();
      return { cancelled, uncertain };
    }

    function snapshot(accountId) {
      const id = accountId == null ? visibleAccount : String(accountId);
      if (!id || !queues.has(id)) return [];
      return queues.get(id).map(publishItem);
    }

    return { bindAccount, enqueue, retry, saveCopy, skip, remove, reset, cancelUnfinished, snapshot, get accountId() { return visibleAccount; } };
  }

  return {
    uploadCopy,
    statusText,
    parseHint,
    safeName,
    materialPath,
    copyPath,
    normalizeWorkspaceFiles,
    wireWorkspaceFiles,
    sameWorkspaceFiles,
    subtractWorkspaceFiles,
    toggleCitation,
    messageFiles,
    retainCitedMessages,
    isFileDrag,
    selectedFiles,
    createDropHandlers,
    createController
  };
});
