import { useMemo, useRef, useState } from "react";
import { AtSign, Bold, Code, Italic, List, ListOrdered, Paperclip, Quote, SendHorizontal, X } from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

const mentionContextFromText = (text, caretPosition) => {
  const beforeCaret = text.slice(0, caretPosition);
  const atIndex = beforeCaret.lastIndexOf("@");
  if (atIndex === -1) return null;
  const hasSpaceBefore = atIndex > 0 && !/\s/.test(beforeCaret[atIndex - 1]);
  if (hasSpaceBefore) return null;
  const query = beforeCaret.slice(atIndex + 1);
  if (/\s/.test(query)) return null;
  return { start: atIndex, end: caretPosition, query };
};

const normalizeMentionUsers = (users = []) =>
  users
    .map((u, i) => {
      if (typeof u === "string") return { id: `${u}-${i}`, name: u };
      const name = u?.nome || u?.name || u?.email || "";
      return { id: u?._id || u?.id || `${name}-${i}`, name };
    })
    .filter(u => u.name)
    .reduce((acc, u) => {
      if (!acc.some(x => x.name.toLowerCase() === u.name.toLowerCase())) acc.push(u);
      return acc;
    }, []);

// ── componente ───────────────────────────────────────────────────────────────

export default function CommentInput({
  onSend,
  placeholder,
  mentionUsers = [],
  initialValue = "",
}) {
  const [value, setValue] = useState(initialValue);
  const [attachments, setAttachments] = useState([]);
  const [focused, setFocused] = useState(false);
  const textAreaRef = useRef();
  const [mentionState, setMentionState] = useState({
    isOpen: false, query: "", start: 0, end: 0, activeIndex: 0,
  });

  const users = useMemo(() => mentionState.isOpen ? normalizeMentionUsers(mentionUsers) : [], [mentionUsers, mentionState.isOpen]);

  const filteredUsers = useMemo(() => {
    if (!mentionState.isOpen || !users.length) return [];
    const q = mentionState.query.trim().toLowerCase();
    return q ? users.filter(u => u.name.toLowerCase().includes(q)) : users;
  }, [mentionState.isOpen, mentionState.query, users]);

  // ── formatação ──
  const applyInlineFormat = (prefix, suffix = prefix) => {
    const node = textAreaRef.current;
    if (!node) return;
    const s = node.selectionStart ?? value.length;
    const e = node.selectionEnd ?? value.length;
    const sel = value.slice(s, e) || "texto";
    const next = `${value.slice(0, s)}${prefix}${sel}${suffix}${value.slice(e)}`;
    setValue(next);
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(s + prefix.length, s + prefix.length + sel.length);
    });
  };

  const applyLinePrefix = (prefix) => {
    const node = textAreaRef.current;
    if (!node) return;
    const s = node.selectionStart ?? value.length;
    const e = node.selectionEnd ?? value.length;
    const block = (value.slice(s, e) || "item").split("\n").map(l => l.trim() ? `${prefix}${l}` : l).join("\n");
    const next = `${value.slice(0, s)}${block}${value.slice(e)}`;
    setValue(next);
    requestAnimationFrame(() => { node.focus(); node.setSelectionRange(s, s + block.length); });
  };

  // ── menções ──
  const closeMention = () => setMentionState(p => ({ ...p, isOpen: false, activeIndex: 0 }));

  const insertMention = (name) => {
    const node = textAreaRef.current;
    const safe = (name || "").trim().replace(/\s+/g, " ");
    if (!safe) return;
    const mention = `@${safe} `;
    const next = `${value.slice(0, mentionState.start)}${mention}${value.slice(mentionState.end)}`;
    const caret = mentionState.start + mention.length;
    setValue(next);
    closeMention();
    requestAnimationFrame(() => { node?.focus(); node?.setSelectionRange(caret, caret); });
  };

  const handleTextChange = (v, caret) => {
    setValue(v);
    const ctx = mentionContextFromText(v, caret);
    if (!ctx) { closeMention(); return; }
    setMentionState(p => ({ ...p, isOpen: true, query: ctx.query, start: ctx.start, end: ctx.end, activeIndex: 0 }));
  };

  const handleKeyDown = (e) => {
    if (!mentionState.isOpen || !filteredUsers.length) return;
    if (e.key === "ArrowDown")   { e.preventDefault(); setMentionState(p => ({ ...p, activeIndex: (p.activeIndex + 1) % filteredUsers.length })); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMentionState(p => ({ ...p, activeIndex: p.activeIndex === 0 ? filteredUsers.length - 1 : p.activeIndex - 1 })); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredUsers[mentionState.activeIndex]?.name || ""); }
    else if (e.key === "Escape") { e.preventDefault(); closeMention(); }
  };

  const handleMentionBtn = () => {
    const node = textAreaRef.current;
    const s = node?.selectionStart ?? value.length;
    const e = node?.selectionEnd ?? value.length;
    const next = `${value.slice(0, s)}@${value.slice(e)}`;
    setValue(next);
    requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(s + 1, s + 1);
      setMentionState({ isOpen: true, query: "", start: s, end: s + 1, activeIndex: 0 });
    });
  };

  // Processa arquivos internamente — elimina race condition com FileReader externo
  const handleFile = (e) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    e.target.value = "";
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result;
        if (base64) setAttachments((prev) => [...prev, { name: file.name, type: file.type, data: base64 }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (idx) => setAttachments((prev) => prev.filter((_, i) => i !== idx));

  const handleSend = () => {
    if (!value.trim() && attachments.length === 0) return;
    onSend?.(value, attachments);
    setValue("");
    setAttachments([]);
  };

  const toolbarActions = [
    { key: "bold",    title: "Negrito",        icon: <Bold size={13} />,        action: () => applyInlineFormat("**") },
    { key: "italic",  title: "Itálico",         icon: <Italic size={13} />,      action: () => applyInlineFormat("*") },
    { key: "quote",   title: "Citação",         icon: <Quote size={13} />,       action: () => applyLinePrefix("> ") },
    { key: "list",    title: "Lista",           icon: <List size={13} />,        action: () => applyLinePrefix("- ") },
    { key: "ordered", title: "Lista numerada",  icon: <ListOrdered size={13} />, action: () => applyLinePrefix("1. ") },
    { key: "code",    title: "Código",          icon: <Code size={13} />,        action: () => applyInlineFormat("`") },
  ];

  // ── estilos ──
  const containerStyle = {
    border: `1.5px solid ${focused ? "rgba(108,59,255,0.5)" : "var(--border, rgba(100,80,160,0.18))"}`,
    borderRadius: 14,
    background: "var(--bg-card, #fff)",
    boxShadow: focused ? "0 0 0 3px rgba(108,59,255,0.1)" : "0 2px 8px rgba(80,50,160,0.06)",
    overflow: "visible",
    transition: "border-color 0.18s, box-shadow 0.18s",
    position: "relative",
  };

  const toolbarStyle = {
    display: "flex",
    gap: 3,
    padding: "8px 10px",
    borderBottom: "1px solid var(--border, rgba(100,80,160,0.12))",
    background: "var(--bg-input, #faf7ff)",
    borderRadius: "12px 12px 0 0",
    flexWrap: "wrap",
  };

  const toolbarBtnStyle = {
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 6,
    padding: "5px 7px",
    cursor: "pointer",
    color: "var(--text-label, #6b5ca8)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.13s, color 0.13s",
  };

  const textareaStyle = {
    width: "100%",
    border: "none",
    padding: "12px 14px",
    background: "transparent",
    color: "var(--text, #1e1a61)",
    fontSize: 13.5,
    minHeight: 88,
    outline: "none",
    fontFamily: "inherit",
    resize: "none",
    boxSizing: "border-box",
    lineHeight: 1.6,
    display: "block",
  };

  const actionBarStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px",
    borderTop: "1px solid var(--border, rgba(100,80,160,0.12))",
    background: "var(--bg-input, #faf7ff)",
    borderRadius: "0 0 12px 12px",
  };

  const iconBtnStyle = {
    background: "transparent",
    border: "1px solid transparent",
    borderRadius: 7,
    padding: "5px 7px",
    cursor: "pointer",
    color: "var(--text-label, #6b5ca8)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.13s, color 0.13s",
  };

  const sendBtnStyle = {
    background: "linear-gradient(135deg, #6c3bff, #9b6dff)",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    padding: "7px 16px",
    fontWeight: 700,
    fontSize: 13,
    cursor: value.trim() ? "pointer" : "not-allowed",
    opacity: value.trim() ? 1 : 0.5,
    boxShadow: value.trim() ? "0 3px 10px rgba(108,59,255,0.3)" : "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "opacity 0.15s, box-shadow 0.15s",
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Dropdown de menção — acima da caixa */}
      {mentionState.isOpen && (
        <div style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "calc(100% + 6px)",
          background: "var(--bg-card, #fff)",
          border: "1.5px solid var(--border, rgba(100,80,160,0.18))",
          borderRadius: 12,
          boxShadow: "0 12px 32px rgba(61,44,140,0.16)",
          maxHeight: 220,
          overflowY: "auto",
          zIndex: 50,
        }}>
          {filteredUsers.length === 0 ? (
            <div style={{ padding: "10px 14px", color: "var(--text-label)", fontSize: 13 }}>
              Nenhum usuário encontrado.
            </div>
          ) : filteredUsers.map((user, idx) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(user.name); }}
              style={{
                width: "100%",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                padding: "9px 14px",
                background: idx === mentionState.activeIndex ? "var(--bg-input, #f0eaff)" : "transparent",
                color: "var(--text, #37267f)",
                fontSize: 13,
                fontWeight: idx === mentionState.activeIndex ? 700 : 500,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "linear-gradient(135deg, #6c3bff, #9b6dff)",
                color: "#fff", fontSize: 10, fontWeight: 800,
                display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {user.name.charAt(0).toUpperCase()}
              </span>
              @{user.name}
            </button>
          ))}
        </div>
      )}

      {/* Caixa principal */}
      <div style={containerStyle}>
        {/* Toolbar de formatação */}
        <div style={toolbarStyle}>
          {toolbarActions.map(({ key, title, icon, action }) => (
            <button
              key={key}
              type="button"
              title={title}
              onClick={action}
              style={toolbarBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(108,59,255,0.1)"; e.currentTarget.style.color = "#6c3bff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-label, #6b5ca8)"; }}
            >
              {icon}
            </button>
          ))}
          {value.length > 0 && (
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-label)", alignSelf: "center", opacity: 0.7 }}>
              {value.length}
            </span>
          )}
        </div>

        {/* Área de texto */}
        <textarea
          ref={textAreaRef}
          style={textareaStyle}
          value={value}
          onChange={e => handleTextChange(e.target.value, e.target.selectionStart || 0)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || "Escreva um comentário… use @ para mencionar"}
          rows={3}
        />

        {/* Preview de anexos */}
        {attachments.length > 0 && (
          <div style={{
            margin: "0 10px 8px",
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--bg-input)",
            padding: 8,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            overflowX: "auto",
          }}>
            {attachments.map((att, idx) => (
              <div key={idx} style={{ position: "relative", flexShrink: 0 }}>
                {att.type?.startsWith("image/") ? (
                  <img src={att.data} alt={att.name || "Imagem"} style={{ maxWidth: 100, maxHeight: 90, borderRadius: 8, display: "block", border: "1px solid var(--border)" }} />
                ) : att.type?.startsWith("video/") ? (
                  <video controls style={{ maxWidth: 100, maxHeight: 90, borderRadius: 8, display: "block", border: "1px solid var(--border)" }}>
                    <source src={att.data} type={att.type} />
                  </video>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-label)", fontSize: 12, fontWeight: 600, padding: "4px 8px", background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <Paperclip size={13} />
                    <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={att.name}>{att.name || "Arquivo"}</span>
                  </div>
                )}
                {(
                  <button type="button" onClick={() => removeAttachment(idx)} title="Remover"
                    style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-label)", cursor: "pointer", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    <X size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Barra inferior */}
        <div style={actionBarStyle}>
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" title="Mencionar alguém" onClick={handleMentionBtn} style={iconBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(108,59,255,0.1)"; e.currentTarget.style.color = "#6c3bff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-label, #6b5ca8)"; }}>
              <AtSign size={15} />
            </button>
            <label title="Anexar arquivo" style={{ ...iconBtnStyle, cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(108,59,255,0.1)"; e.currentTarget.style.color = "#6c3bff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-label, #6b5ca8)"; }}>
              <Paperclip size={15} />
              <input type="file" style={{ display: "none" }} onChange={handleFile} multiple />
            </label>
          </div>

          <button type="button" onClick={handleSend} disabled={!value.trim() && attachments.length === 0} style={{ ...sendBtnStyle, opacity: (value.trim() || attachments.length > 0) ? 1 : 0.5, cursor: (value.trim() || attachments.length > 0) ? "pointer" : "not-allowed" }}>
            <SendHorizontal size={13} /> Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
