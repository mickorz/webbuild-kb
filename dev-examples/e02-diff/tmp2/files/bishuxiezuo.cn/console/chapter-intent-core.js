(function (root) {
  "use strict";

  function normalizeChapterNumber(chapterNumber) {
    const value = Number(chapterNumber);
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  function storageKey(bookId, chapterNumber) {
    const no = normalizeChapterNumber(chapterNumber);
    if (!bookId || no == null) return null;
    return "lf_chapter_intent_" + String(bookId) + "_" + no;
  }

  function read(storage, bookId, chapterNumber) {
    const key = storageKey(bookId, chapterNumber);
    if (!storage || !key) return "";
    let raw;
    try { raw = storage.getItem(key); } catch (error) { return ""; }
    if (!raw) return "";
    try {
      const record = JSON.parse(raw);
      if (typeof record === "string") return record.trim();
      if (!record || typeof record !== "object") return String(raw).trim();
      if (String(record.bookId || "") !== String(bookId)) return "";
      if (normalizeChapterNumber(record.chapterNumber) !== normalizeChapterNumber(chapterNumber)) return "";
      return typeof record.guidance === "string" ? record.guidance.trim() : "";
    } catch (error) {
      // Legacy values were stored as plain strings under the already
      // book-and-chapter-scoped key, so they are safe to migrate on read.
      return String(raw).trim();
    }
  }

  function write(storage, bookId, chapterNumber, guidance) {
    const key = storageKey(bookId, chapterNumber);
    if (!storage || !key) return false;
    const value = String(guidance || "").trim();
    try {
      if (!value) {
        storage.removeItem(key);
        return true;
      }
      storage.setItem(key, JSON.stringify({
        bookId: String(bookId),
        chapterNumber: normalizeChapterNumber(chapterNumber),
        guidance: value
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  root.LF_CHAPTER_INTENT = { storageKey, read, write };
})(typeof window !== "undefined" ? window : globalThis);
