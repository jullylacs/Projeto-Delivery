import React, { useRef } from "react";

export default function CommentInput({ value, onChange, onSend, onFile, placeholder }) {
  const fileInputRef = useRef();

  // Insere menção @ ao clicar no botão
  const handleMention = () => {
    const mention = "@";
    if (fileInputRef.current) fileInputRef.current.focus();
    onChange(value + mention);
  };

  // Dispara upload de arquivo
  const handleFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFile(e.target.files[0]);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
      <textarea
        ref={fileInputRef}
        style={{
          flex: 1,
          border: "1px solid #e2e0f0",
          borderRadius: 12,
          padding: "12px 14px",
          background: "#fefefe",
          color: "#1e1a61",
          fontSize: 14,
          minHeight: 60,
          outline: "none",
          fontFamily: "inherit",
          resize: "vertical",
        }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || "Escreva um comentário..."}
        rows={2}
      />
      <button type="button" onClick={handleMention} title="Mencionar alguém" style={{ background: "#f5f0ff", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "#6c3bff", fontWeight: 700, fontSize: 18 }}>@</button>
      <label style={{ background: "#f5f0ff", borderRadius: 8, padding: 8, cursor: "pointer", color: "#6c3bff", fontWeight: 700, fontSize: 18 }} title="Anexar arquivo ou foto">
        📎
        <input type="file" style={{ display: "none" }} onChange={handleFile} />
      </label>
      <button type="button" onClick={onSend} style={{ background: "linear-gradient(135deg, #7c5bff, #5a30ff)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
        Enviar
      </button>
    </div>
  );
}
