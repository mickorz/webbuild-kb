/* Workspace references keep immutable file identity; names are only display snapshots. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AssistantReferenceCore = api;
})(typeof globalThis === "object" ? globalThis : this, function (root) {
  const MIME = "application/x-bishu-workspace-reference";
  const upload = () => root.AssistantUploadCore;
  const workspace = () => root.AssistantWorkspaceCore;
  function identity(file) { return file && (file.file_id || file.path) || ""; }
  function reference(file) { return upload().normalizeWorkspaceFiles([file])[0] || null; }
  function contains(files, file) { return (files || []).some(item => identity(item) === identity(file)); }
  function isImage(file) {
    const type = String(file?.content_type || '').split(';')[0];
    return !!file?.file_id && (/^image\/(png|jpeg|webp|gif)$/.test(type) || /\.(png|jpe?g|webp|gif)$/i.test(file?.name_snapshot || file?.name || file?.path || ''));
  }
  async function imageBlob(blob) {
    if (!blob.size || blob.size > 8 * 1024 * 1024) throw Error('Unsupported image size');
    const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
    const type = bytes[0] === 137 && ascii(1, 4) === 'PNG' && bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10 ? 'image/png'
      : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg'
      : ['GIF87a', 'GIF89a'].includes(ascii(0, 6)) ? 'image/gif'
      : ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP' ? 'image/webp' : '';
    if (!type) throw Error('Unsupported image bytes');
    return new Blob([blob], { type });
  }
  function readable(file) {
    const status = file && (file.parse_status || file.parseStatus);
    return !!reference(file) && (isImage(file) || ["ok", "ready", "truncated"].includes(status));
  }
  function selectable(file) { return !!reference(file) && (!file.parse_status && !file.parseStatus || readable(file)); }
  function merge(current, incoming, reserved = 0) {
    const next = upload().normalizeWorkspaceFiles(current);
    for (const file of incoming || []) {
      const item = reference(file);
      if (!item) return { accepted: false, reason: "invalid", files: next };
      if (!contains(next, item)) next.push(item);
    }
    return { accepted: true, files: next };
  }
  function pageOf(result) {
    const files = result && (result.files || result.matches);
    if (!Array.isArray(files) || !Number.isInteger(result.total) || result.total < 0) throw Error("Invalid file list");
    if (files.some(file => !file || !workspace().validPath(file.path) || typeof file.version !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(file.version) ||
        (file.file_id && !workspace().validFileId(file.file_id)))) throw Error("Invalid file metadata");
    return { files, total: result.total };
  }
  function previewOf(file, result) {
    const state = workspace().cleanState(file.path, result);
    if (!state || typeof result.text !== "string" || state.version !== file.version ||
        (file.file_id ? state.file_id !== file.file_id : state.path !== file.path)) throw Error("Invalid preview");
    return { ...state, text: result.text };
  }
  function copyFor(lang) {
    const en = lang === "en";
    return {
      title: en ? "Reference library" : "资料库", trigger: en ? "Add references" : "添加参考资料",
      upload: en ? "Upload files" : "上传文件", search: en ? "Search files and text" : "搜索文件和内容",
      all: en ? "All files" : "全部文件", material: en ? "Materials" : "资料", note: en ? "Notes" : "手记", output: en ? "Outputs" : "产出", other: en ? "Other" : "其他",
      add: en ? "Add to message" : "添加到输入框", attached: en ? "Added" : "已添加", select: en ? "Select" : "勾选", deselect: en ? "Deselect" : "取消勾选",
      selected: count => en ? `${count} selected` : `已勾选 ${count} 份`, preview: en ? "Preview" : "预览", close: en ? "Close library" : "关闭资料库", back: en ? "Back to files" : "返回文件列表",
      loading: en ? "Loading…" : "正在读取…", empty: en ? "No reference files yet." : "还没有参考资料。", noMatch: en ? "No matching files." : "没有找到匹配文件。",
      clear: en ? "Clear search" : "清空搜索", retry: en ? "Retry" : "重试", refresh: en ? "Refresh" : "刷新", more: en ? "Load more" : "加载更多",
      unavailable: en ? "Could not read the workspace. Try again." : "工作区暂时无法读取，请重试。",
      forbidden: en ? "You do not have access to this workspace." : "暂无权限访问工作区。",
      unsupported: en ? "No readable text. The original remains in your workspace." : "未提取到文字，原文件仍保留在工作区。",
      capacity: en ? "Storage is full. Delete unused files or increase your allowance." : "资料空间已满，请删除不用的文件或提高配额。",
      rateLimited: en ? "Content was read too frequently. Try again shortly." : "内容读取过于频繁，请稍后重试。",
      originBlocked: en ? "New file fetches are paused. Cached content is still available." : "新的文件取回已暂停，缓存内容仍可读取。",
      missing: en ? "This file no longer exists. Refresh the library." : "文件已不存在，请刷新资料库。",
      invalid: en ? "Could not verify this file. Refresh and select it again." : "暂时无法核对文件，请刷新后重新选择。",
      conflict: en ? "This version is no longer available. Refresh and select it again." : "这个文件版本已不可用，请刷新后重新选择。",
      limit: en ? "This message is too long. Reduce its text or references." : "当前消息过长，请减少文字或引用后重试。",
      drop: en ? "Drop to add to this message" : "松开，添加到这条消息", uploadDrop: en ? "Drop to upload to the library" : "松开，上传到资料库",
      partial: en ? "Showing the beginning of the file." : "当前预览文件开头。", unreadable: en ? "No readable text" : "无可读文字",
      cancelled: en ? "Selection stays here until you add it." : "勾选后添加到本条消息。"
    };
  }
  return { isImage, imageBlob, MIME, identity, reference, contains, readable, selectable, merge, pageOf, previewOf, copyFor };
});
