import React, { useMemo, useRef, useState } from "react";
import { AtSign, Bold, Code, Italic, List, ListOrdered, Paperclip, Quote, SendHorizontal } from "lucide-react";

const normalizeMentionUsers = (users = []) => {
  return users
    .map((user, index) => {
      if (typeof user === "string") {
        return { id: `${user}-${index}`, name: user };
      }

      const fallback = user?.nome || user?.name || user?.email || "";
      return {
        id: user?._id || user?.id || `${fallback}-${index}`,
        name: fallback,
      };
    })
    .filter((user) => user.name)
    .reduce((acc, user) => {
      if (acc.some((item) => item.name.toLowerCase() === user.name.toLowerCase())) {
        return acc;
      }

      acc.push(user);
      return acc;
    }, []);
};

const mentionContextFromText = (text, caretPosition) => {
  const beforeCaret = text.slice(0, caretPosition);
  const atIndex = beforeCaret.lastIndexOf("@");

  if (atIndex === -1) return null;

  const hasSpaceBefore = atIndex > 0 && !/\s/.test(beforeCaret[atIndex - 1]);
  if (hasSpaceBefore) return null;

  const query = beforeCaret.slice(atIndex + 1);
  if (/\s/.test(query)) return null;

  return {
    start: atIndex,
    end: caretPosition,
    query,
  };
};

export default function CommentInput({
  value,
  onChange,
  onSend,
  onFile,
  placeholder,
  mentionUsers = [],
  pendingAttachment = null,
  onClearAttachment,
}) {
  const textAreaRef = useRef();
  const [mentionState, setMentionState] = useState({
    isOpen: false,
    query: "",
    start: 0,
    end: 0,
    activeIndex: 0,
  });

  const users = useMemo(() => normalizeMentionUsers(mentionUsers), [mentionUsers]);

  const applyInlineFormat = (prefix, suffix = prefix) => {
    const node = textAreaRef.current;
    if (!node) return;

    const start = node.selectionStart ?? value.length;
    const end = node.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || "texto";
    const formatted = `${prefix}${selected}${suffix}`;
    const nextValue = `${value.slice(0, start)}${formatted}${value.slice(end)}`;

    onChange(nextValue);

    requestAnimationFrame(() => {
      node.focus();
      const caretStart = start + prefix.length;
      const caretEnd = caretStart + selected.length;
      node.setSelectionRange(caretStart, caretEnd);
    });
  };

  const applyLinePrefix = (prefix) => {
    const node = textAreaRef.current;
    if (!node) return;

    const start = node.selectionStart ?? value.length;
    const end = node.selectionEnd ?? value.length;
    const selected = value.slice(start, end);

    const block = selected || "item";
    const prefixed = block
      .split("\n")
      .map((line) => (line.trim() ? `${prefix}${line}` : line))
      .join("\n");

    const nextValue = `${value.slice(0, start)}${prefixed}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(start, start + prefixed.length);
    });
  };

  const filteredUsers = useMemo(() => {
    const query = mentionState.query.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => user.name.toLowerCase().includes(query));
  }, [mentionState.query, users]);

  // Insere menção @ ao clicar no botão
  const handleMention = () => {
    const node = textAreaRef.current;
    const mention = "@";
    if (!node) {
      onChange(`${value}${mention}`);
      return;
    }

    const start = node.selectionStart ?? value.length;
    const end = node.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${mention}${value.slice(end)}`;

    onChange(nextValue);

    requestAnimationFrame(() => {
      node.focus();
      const nextCaret = start + 1;
      node.setSelectionRange(nextCaret, nextCaret);
      setMentionState({ isOpen: true, query: "", start, end: nextCaret, activeIndex: 0 });
    });
  };

  const closeMentionList = () => {
    setMentionState((prev) => ({ ...prev, isOpen: false, activeIndex: 0 }));
  };

  const insertMention = (name) => {
    const node = textAreaRef.current;
    const safeName = (name || "").trim().replace(/\s+/g, " ");
    if (!safeName) return;

    const prefix = value.slice(0, mentionState.start);
    const suffix = value.slice(mentionState.end);
    const mentionText = `@${safeName} `;
    const nextValue = `${prefix}${mentionText}${suffix}`;
    const nextCaret = prefix.length + mentionText.length;

    onChange(nextValue);
    closeMentionList();

    requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleTextChange = (nextValue, caretPosition) => {
    onChange(nextValue);

    const context = mentionContextFromText(nextValue, caretPosition);
    if (!context) {
      closeMentionList();
      return;
    }

    setMentionState((prev) => ({
      ...prev,
      isOpen: true,
      query: context.query,
      start: context.start,
      end: context.end,
      activeIndex: 0,
    }));
  };

  const handleKeyDown = (event) => {
    if (!mentionState.isOpen || filteredUsers.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMentionState((prev) => ({
        ...prev,
        activeIndex: (prev.activeIndex + 1) % filteredUsers.length,
      }));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setMentionState((prev) => ({
        ...prev,
        activeIndex: prev.activeIndex === 0 ? filteredUsers.length - 1 : prev.activeIndex - 1,
      }));
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insertMention(filteredUsers[mentionState.activeIndex]?.name || "");
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMentionList();
    }
  };

  // Dispara upload de arquivo
  const handleFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 6 }}>
      <div style={{ flex: 1, position: "relative" }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 8,
            flexWrap: "wrap",
          }}
        >
          {[{
            key: "bold",
            title: "Negrito",
            icon: <Bold size={14} />,
            onClick: () => applyInlineFormat("**"),
          }, {
            key: "italic",
            title: "Itálico",
            icon: <Italic size={14} />,
            onClick: () => applyInlineFormat("*"),
          }, {
            key: "quote",
            title: "Citação",
            icon: <Quote size={14} />,
            onClick: () => applyLinePrefix("> "),
          }, {
            key: "list",
            title: "Lista",
            icon: <List size={14} />,
            onClick: () => applyLinePrefix("- "),
          }, {
            key: "ordered",
            title: "Lista numerada",
            icon: <ListOrdered size={14} />,
            onClick: () => applyLinePrefix("1. "),
          }, {
            key: "code",
            title: "Código",
            icon: <Code size={14} />,
            onClick: () => applyInlineFormat("`"),
          }].map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              title={action.title}
              style={{
                background: "#f1eaff",
                border: "1px solid #daccff",
                borderRadius: 7,
                padding: "6px 7px",
                cursor: "pointer",
                color: "#5f3dc6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {action.icon}
            </button>
          ))}
        </div>

        <textarea
          ref={textAreaRef}
          style={{
            width: "100%",
            border: "1px solid #d7ccff",
            borderRadius: 10,
            padding: "12px 14px",
            background: "#ffffff",
            color: "#1e1a61",
            fontSize: 14,
            minHeight: 132,
            outline: "none",
            fontFamily: "inherit",
            resize: "vertical",
            boxShadow: "inset 0 0 0 1px #efe8ff",
            boxSizing: "border-box",
          }}
          value={value}
          onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart || 0)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Escreva um comentário..."}
          rows={2}
        />

        {pendingAttachment && (
          <div
            style={{
              marginTop: 8,
              border: "1px solid #ded2ff",
              borderRadius: 10,
              background: "#f8f5ff",
              padding: 8,
              position: "relative",
            }}
          >
            {pendingAttachment.type?.startsWith("image/") ? (
              <img
                src={pendingAttachment.data}
                alt={pendingAttachment.name || "Imagem anexada"}
                style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 8, display: "block", border: "1px solid #ddd0ff" }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#5f3dc6", fontSize: 13, fontWeight: 600 }}>
                <Paperclip size={14} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pendingAttachment.name || "Arquivo anexado"}</span>
              </div>
            )}

            {onClearAttachment && (
              <button
                type="button"
                onClick={onClearAttachment}
                title="Remover anexo"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "1px solid #cdbfff",
                  background: "#ffffff",
                  color: "#6b54c7",
                  cursor: "pointer",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
        )}

        {mentionState.isOpen && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: "calc(100% + 6px)",
              background: "#ffffff",
              border: "1px solid #d7ccff",
              borderRadius: 10,
              boxShadow: "0 12px 28px rgba(61, 44, 140, 0.16)",
              maxHeight: 220,
              overflowY: "auto",
              zIndex: 20,
            }}
          >
            {filteredUsers.length === 0 ? (
              <div style={{ padding: "10px 12px", color: "#7c72ad", fontSize: 13 }}>
                Nenhum usuário encontrado.
              </div>
            ) : (
              filteredUsers.map((user, idx) => {
                const isActive = idx === mentionState.activeIndex;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(user.name);
                    }}
                    style={{
                      width: "100%",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      padding: "9px 12px",
                      background: isActive ? "#efe9ff" : "#ffffff",
                      color: "#37267f",
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 600,
                    }}
                  >
                    @{user.name}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleMention}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 10px rgba(95, 61, 198, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
        title="Mencionar alguém"
        style={{
          background: "#ece3ff",
          border: "1px solid #d6c7ff",
          borderRadius: 8,
          padding: 8,
          cursor: "pointer",
          color: "#5f3dc6",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
        }}
      >
        <AtSign size={18} />
      </button>
      <label
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 10px rgba(95, 61, 198, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
        style={{
          background: "#ece3ff",
          border: "1px solid #d6c7ff",
          borderRadius: 8,
          padding: 8,
          cursor: "pointer",
          color: "#5f3dc6",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
        }}
        title="Anexar arquivo ou foto"
      >
        <Paperclip size={18} />
        <input type="file" style={{ display: "none" }} onChange={handleFile} />
      </label>
      <button
        type="button"
        onClick={onSend}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 6px 14px rgba(78,46,187,0.45)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(78,46,187,0.35)";
        }}
        style={{
          background: "linear-gradient(135deg, #7450f5, #4e2ebb)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "10px 14px",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(78,46,187,0.35)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "all 0.15s ease",
        }}
      >
        <SendHorizontal size={14} />
        Enviar
      </button>
    </div>
  );
}
