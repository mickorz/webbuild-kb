{
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Controlled plain-text editor with atomic reference tokens and a serializable undo history. */
(function () {
  const {
      useRef,
      useLayoutEffect,
      useEffect
    } = React,
    Core = window.AssistantInlineCore;
  function AssistantInlineEditor({
    inputRef,
    value,
    files,
    onChange,
    onFilesChange,
    disabled,
    onKeyDown,
    ...attrs
  }) {
    const host = useRef(null),
      state = useRef(null),
      range = useRef(null),
      history = useRef([]),
      cursor = useRef(-1);
    const composing = useRef(false),
      latest = useRef(null),
      dragged = useRef(null);
    latest.current = {
      value,
      files,
      onChange,
      onFilesChange,
      disabled,
      onKeyDown
    };
    function read(node = host.current) {
      if (node.nodeType === 3) return node.data;
      if (node.dataset?.reference) return node.dataset.reference;
      if (node.nodeName === 'BR') return '\n';
      return Array.from(node.childNodes).map((child, i) => (i && /^(DIV|P)$/.test(child.nodeName) ? '\n' : '') + read(child)).join('');
    }
    function saveRange() {
      const selected = window.getSelection();
      if (selected?.rangeCount && host.current.contains(selected.getRangeAt(0).commonAncestorContainer)) range.current = selected.getRangeAt(0).cloneRange();
    }
    function restoreRange() {
      const el = host.current;
      el.focus();
      const current = range.current && el.contains(range.current.commonAncestorContainer) ? range.current : document.createRange();
      if (current !== range.current) {
        current.selectNodeContents(el);
        current.collapse(false);
      }
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(current);
      return current;
    }
    function render(text, references) {
      const el = host.current;
      el.replaceChildren();
      Core.parts(text, references).forEach(part => {
        if (!part.file) {
          el.append(document.createTextNode(part.text));
          return;
        }
        const chip = document.createElement('span');
        chip.className = 'asst-inline-reference';
        chip.contentEditable = 'false';
        chip.dataset.reference = part.text;
        chip.title = part.file.name_snapshot || part.file.path;
        chip.dataset.referenceColor = Core.color(part.file);
        chip.draggable = !latest.current.disabled;
        chip.tabIndex = latest.current.disabled ? -1 : 0;
        chip.setAttribute('aria-keyshortcuts', 'Alt+ArrowLeft Alt+ArrowRight');
        chip.addEventListener('keydown', event => {
          if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key) || latest.current.disabled) return;
          event.preventDefault();
          event.stopPropagation();
          const start = chipOffset(chip),
            text = read(),
            end = start + part.text.length;
          const adjacent = event.key === 'ArrowLeft' ? Core.parts(text.slice(0, start), state.current.files).at(-1) : Core.parts(text.slice(end), state.current.files)[0];
          if (!adjacent) return;
          const step = adjacent.file ? adjacent.text.length : (event.key === 'ArrowLeft' ? Array.from(adjacent.text).at(-1) : Array.from(adjacent.text)[0]).length;
          moveChip(chip, event.key === 'ArrowLeft' ? start - step : end + step, true);
        });
        const label = document.createElement('span');
        label.textContent = chip.title;
        chip.append(label);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.tabIndex = -1;
        remove.setAttribute('aria-label', (window.CLANG === 'en' ? 'Remove ' : '移除 ') + chip.title);
        remove.textContent = '×';
        remove.addEventListener('mousedown', event => event.preventDefault());
        remove.addEventListener('click', () => {
          if (!latest.current.disabled) {
            chip.remove();
            publish();
            el.focus();
          }
        });
        chip.append(remove);
        el.append(chip);
      });
      // An empty text node after a final token gives the caret somewhere to land.
      el.append(document.createTextNode(''));
      range.current = null;
    }
    function rangeOffset(selected) {
      const prefix = document.createRange();
      prefix.selectNodeContents(host.current);
      prefix.setEnd(selected.startContainer, selected.startOffset);
      return read(prefix.cloneContents()).length;
    }
    function chipOffset(chip) {
      const selected = document.createRange();
      selected.setStartBefore(chip);
      selected.collapse(true);
      return rangeOffset(selected);
    }
    function moveChip(chip, destination, focusChip = false) {
      if (latest.current.disabled || !host.current.contains(chip)) return;
      const text = read(),
        start = chipOffset(chip),
        token = chip.dataset.reference,
        end = start + token.length;
      if (destination >= start && destination <= end) return;
      const offset = destination > end ? destination - token.length : destination;
      const without = text.slice(0, start) + text.slice(end);
      render(without.slice(0, offset) + token + without.slice(offset), state.current.files);
      setCaret(offset + token.length);
      publish();
      if (focusChip) {
        const moved = Array.from(host.current.querySelectorAll('[data-reference]')).find(node => chipOffset(node) === offset);
        moved?.focus();
      } else host.current.focus();
    }
    function clearDrag() {
      dragged.current?.classList.remove('is-dragging');
      dragged.current = null;
    }
    function dragStart(event) {
      const chip = event.target.closest?.('[data-reference]');
      if (!chip || !host.current.contains(chip)) return;
      if (latest.current.disabled || event.target.closest?.('button')) {
        event.preventDefault();
        return;
      }
      dragged.current = chip;
      chip.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/x-bishu-inline-reference', 'move');
      // Names are only a harmless external fallback. Internal moves trust this editor's DOM node.
      event.dataTransfer.setData('text/plain', chip.title);
      event.stopPropagation();
    }
    function dragOver(event) {
      if (!dragged.current || latest.current.disabled || !host.current.contains(dragged.current)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      if (host.current.setDropCaret(event.clientX, event.clientY)) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range.current.cloneRange());
      }
    }
    function drop(event) {
      if (!dragged.current) return;
      event.preventDefault();
      event.stopPropagation();
      const chip = dragged.current;
      if (!latest.current.disabled && host.current.setDropCaret(event.clientX, event.clientY)) moveChip(chip, rangeOffset(range.current));
      clearDrag();
    }
    function checkpoint(next) {
      if (history.current[cursor.current]?.value === next.value) return;
      history.current = history.current.slice(0, cursor.current + 1).concat([{
        value: next.value,
        files: [...next.files]
      }]).slice(-80);
      cursor.current = history.current.length - 1;
    }
    function publish(references = state.current.files) {
      const text = read();
      if (text.length > 8000) {
        render(state.current.value, state.current.files);
        return;
      }
      const next = {
        value: text,
        files: Core.active(text, references)
      };
      state.current = next;
      checkpoint(next);
      saveRange();
      latest.current.onFilesChange(next.files);
      latest.current.onChange({
        target: {
          value: text
        }
      });
    }
    function insertText(text, references = state.current.files) {
      if (latest.current.disabled) return;
      const selected = restoreRange();
      selected.deleteContents();
      const node = document.createTextNode(text);
      selected.insertNode(node);
      selected.setStartAfter(node);
      selected.collapse(true);
      range.current = selected.cloneRange();
      const offset = (() => {
        const prefix = document.createRange();
        prefix.selectNodeContents(host.current);
        prefix.setEnd(selected.endContainer, selected.endOffset);
        return read(prefix.cloneContents()).length;
      })();
      publish(references);
      render(state.current.value, state.current.files);
      setCaret(offset);
    }
    function setCaret(offset) {
      const el = host.current,
        selection = window.getSelection(),
        next = document.createRange();
      let remaining = offset;
      for (const child of el.childNodes) {
        const length = read(child).length;
        if (remaining <= length) {
          if (child.nodeType === 3) next.setStart(child, Math.min(remaining, length));else if (remaining === 0) next.setStartBefore(child);else next.setStartAfter(child);
          next.collapse(true);
          selection.removeAllRanges();
          selection.addRange(next);
          range.current = next.cloneRange();
          return;
        }
        remaining -= length;
      }
      next.selectNodeContents(el);
      next.collapse(false);
      selection.removeAllRanges();
      selection.addRange(next);
      range.current = next;
    }
    useLayoutEffect(() => {
      const el = host.current;
      if (!el) return;
      el.disabled = disabled;
      el.value = value;
      inputRef.current = el;
      el.querySelectorAll('[data-reference]').forEach(chip => {
        chip.draggable = !disabled;
        chip.tabIndex = disabled ? -1 : 0;
      });
      el.setSelectionRange = offset => setCaret(offset);
      el.setDropCaret = (x, y) => {
        const selected = document.caretRangeFromPoint?.(x, y);
        const point = !selected && document.caretPositionFromPoint?.(x, y);
        const next = selected || point && document.createRange();
        if (point && next) {
          next.setStart(point.offsetNode, point.offset);
          next.collapse(true);
        }
        if (next && el.contains(next.commonAncestorContainer)) {
          const anchor = next.startContainer.nodeType === 3 ? next.startContainer.parentElement : next.startContainer;
          const chip = anchor.closest?.('[data-reference]');
          if (chip) {
            const rect = chip.getBoundingClientRect();
            if (x < rect.left + rect.width / 2) next.setStartBefore(chip);else next.setStartAfter(chip);
            next.collapse(true);
          }
          range.current = next;
          return true;
        }
        return false;
      };
      el.insertReferences = references => {
        const present = read();
        const additions = references.filter(file => Core.token(file) && !present.includes(Core.token(file)));
        if (additions.length) insertText(additions.map(Core.token).join(' '), references);
      };
      if (!state.current || state.current.value !== value || JSON.stringify(state.current.files) !== JSON.stringify(files)) {
        if (state.current && state.current.value !== value) {
          history.current = [];
          cursor.current = -1;
        }
        state.current = {
          value,
          files
        };
        render(value, files);
        checkpoint(state.current);
      }
    }, [value, files, disabled]);
    useEffect(() => {
      document.addEventListener('selectionchange', saveRange);
      document.addEventListener('dragend', clearDrag);
      return () => {
        clearDrag();
        document.removeEventListener('dragend', clearDrag);
        document.removeEventListener('selectionchange', saveRange);
        if (inputRef.current === host.current) inputRef.current = null;
      };
    }, []);
    function key(event) {
      if (event.isComposing || event.nativeEvent?.isComposing || composing.current || event.keyCode === 229 || event.nativeEvent?.keyCode === 229) return;
      if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y')) {
        event.preventDefault();
        const forward = event.shiftKey || event.key.toLowerCase() === 'y';
        const index = cursor.current + (forward ? 1 : -1),
          saved = history.current[index];
        if (saved) {
          cursor.current = index;
          state.current = saved;
          render(saved.value, saved.files);
          setCaret(saved.value.length);
          latest.current.onFilesChange(saved.files);
          latest.current.onChange({
            target: {
              value: saved.value
            }
          });
        }
        return;
      }
      if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        insertText('\n');
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (!disabled && read().trim()) host.current.closest('form')?.requestSubmit();
        return;
      }
      onKeyDown?.(event);
    }
    return /*#__PURE__*/React.createElement("div", _extends({}, attrs, {
      ref: host,
      className: "asst-inline-editor",
      role: "textbox",
      "aria-multiline": "true",
      "aria-disabled": disabled,
      contentEditable: !disabled,
      suppressContentEditableWarning: true,
      "data-placeholder": attrs.placeholder,
      tabIndex: disabled ? -1 : 0,
      onInput: () => {
        if (!composing.current) publish();
      },
      onKeyDown: key,
      onDragStart: dragStart,
      onDragOver: dragOver,
      onDrop: drop,
      onDragEnd: clearDrag,
      onCompositionStart: () => {
        composing.current = true;
      },
      onCompositionEnd: () => {
        composing.current = false;
        publish();
      },
      onPaste: event => {
        event.preventDefault();
        insertText(event.clipboardData.getData('text/plain'));
      },
      onCut: event => {
        saveRange();
        if (!disabled && range.current && !range.current.collapsed) {
          event.preventDefault();
          event.clipboardData.setData('text/plain', read(range.current.cloneContents()));
          range.current.deleteContents();
          publish();
        }
      },
      onCopy: event => {
        saveRange();
        if (range.current && !range.current.collapsed) {
          event.preventDefault();
          event.clipboardData.setData('text/plain', read(range.current.cloneContents()));
        }
      }
    }));
  }
  window.AssistantInlineEditor = AssistantInlineEditor;
})();
}
