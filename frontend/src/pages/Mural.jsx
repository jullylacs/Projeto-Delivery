import { useState, useRef, useEffect } from "react";
import api from "../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bold, Italic, List, ListOrdered, Quote, Code, Pin, Pencil, Trash2, Send, X, Check } from "lucide-react";

// ── Paleta de avatares baseada no nome ───────────────────────────────────────
const AVATAR_PALETTE = [
  ["#6c3bff", "#9b6dff"], ["#e8405a", "#ff7a8a"],
  ["#0e5a7a", "#1b8bbf"], ["#1f7a3f", "#2db05a"],
  ["#ff9500", "#ffb340"], ["#9b1b5a", "#d4387d"],
];
const avatarGradient = (name) => {
  const idx = (name || "?").charCodeAt(0) % AVATAR_PALETTE.length;
  const [a, b] = AVATAR_PALETTE[idx];
  return `linear-gradient(135deg, ${a}, ${b})`;
};
const initials = (name) =>
  String(name || "?").split(" ").filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join("") || "?";

// ── Tempo relativo ────────────────────────────────────────────────────────────
const relativeTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

// ── CSS injetado ──────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@300;400;500;600;700&display=swap');

  .mural-root {
    --ink:      #1a1220;
    --ink-soft: #4a3d60;
    --ink-faint:#8b7faa;
    --bg:       #f4f0ff;
    --surface:  #ffffff;
    --surface2: #f0ebff;
    --accent:   #6c3bff;
    --accent2:  #e8405a;
    --accent3:  #ff9500;
    --border:   rgba(100,80,160,0.14);
    --shadow:   0 2px 16px rgba(60,30,120,0.07);
    --shadow-md:0 8px 32px rgba(60,30,120,0.13);
    font-family: 'Inter', sans-serif;
    background: var(--bg);
    min-height: 100vh;
    padding: 0 0 80px;
  }

  /* ── Header hero ── */
  .mural-hero {
    background: linear-gradient(135deg, #3a0f7a 0%, #6c3bff 55%, #9b6dff 100%);
    padding: 36px 24px 32px;
    position: relative;
    overflow: hidden;
  }
  .mural-hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 60% 80% at 80% 50%, rgba(255,255,255,0.08), transparent);
    pointer-events: none;
  }
  .mural-hero-inner {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    position: relative;
    z-index: 1;
  }
  .mural-title {
    font-family: 'Playfair Display', serif;
    font-size: 34px;
    font-weight: 700;
    color: #fff;
    line-height: 1;
    letter-spacing: -0.5px;
    margin: 0;
  }
  .mural-subtitle {
    margin: 6px 0 0;
    font-size: 13px;
    color: rgba(255,255,255,0.65);
    font-weight: 400;
  }
  .mural-badge {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255,255,255,0.85);
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 999px;
    padding: 4px 12px;
    letter-spacing: 0.4px;
    white-space: nowrap;
  }

  /* ── Corpo ── */
  .mural-body {
    max-width: 760px;
    margin: 0 auto;
    padding: 28px 24px 0;
  }

  /* ── Compose ── */
  .compose-box {
    background: var(--surface);
    border-radius: 18px;
    border: 1.5px solid var(--border);
    box-shadow: var(--shadow-md);
    margin-bottom: 32px;
    overflow: hidden;
    transition: box-shadow 0.2s, border-color 0.2s;
  }
  .compose-box:focus-within {
    box-shadow: 0 12px 40px rgba(108,59,255,0.18);
    border-color: rgba(108,59,255,0.35);
  }
  .compose-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px 0;
  }
  .compose-user-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }
  .compose-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-faint);
  }
  .compose-toolbar {
    display: flex;
    gap: 2px;
    padding: 8px 14px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
  }
  .toolbar-btn {
    background: transparent;
    border: none;
    border-radius: 6px;
    padding: 6px 8px;
    cursor: pointer;
    color: var(--ink-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .toolbar-btn:hover { background: rgba(108,59,255,0.12); color: var(--accent); }

  .compose-textarea {
    width: 100%;
    min-height: 100px;
    padding: 14px 16px;
    border: none;
    resize: vertical;
    font-size: 14.5px;
    font-family: 'Inter', sans-serif;
    font-weight: 400;
    color: var(--ink);
    background: transparent;
    outline: none;
    line-height: 1.65;
    box-sizing: border-box;
  }
  .compose-textarea::placeholder { color: var(--ink-faint); }
  .compose-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 10px 14px;
    border-top: 1px solid var(--border);
    gap: 10px;
  }
  .char-hint { font-size: 11px; color: var(--ink-faint); }
  .publish-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    background: linear-gradient(135deg, #6c3bff, #9b6dff);
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 9px 20px;
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    letter-spacing: 0.2px;
    box-shadow: 0 3px 10px rgba(108,59,255,0.32);
    transition: opacity 0.15s, transform 0.1s;
  }
  .publish-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .publish-btn:active { transform: translateY(0); }

  /* ── Posts ── */
  .posts-list { display: flex; flex-direction: column; gap: 16px; }

  .post-card {
    background: var(--surface);
    border-radius: 18px;
    border: 1.5px solid var(--border);
    box-shadow: var(--shadow);
    overflow: hidden;
    transition: box-shadow 0.2s, transform 0.2s;
    animation: slideIn 0.35s ease both;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .post-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
  .post-card-featured { border-color: rgba(108,59,255,0.3); }

  .post-card-top {
    height: 4px;
    border-radius: 18px 18px 0 0;
  }

  .post-card-body { padding: 18px 20px 14px; }

  .post-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .post-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  .post-author-block { flex: 1; min-width: 0; }
  .post-author {
    font-weight: 600;
    font-size: 14px;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .post-author-role {
    font-size: 11px;
    color: var(--ink-faint);
    font-weight: 400;
    margin-top: 1px;
  }
  .post-date {
    font-size: 12px;
    color: var(--ink-faint);
    font-weight: 400;
    white-space: nowrap;
  }
  .post-featured-badge {
    font-size: 10px;
    font-weight: 700;
    background: linear-gradient(135deg, #6c3bff, #9b6dff);
    color: #fff;
    border-radius: 999px;
    padding: 2px 8px;
    letter-spacing: 0.3px;
  }

  .post-content {
    font-size: 14.5px;
    color: var(--ink-soft);
    line-height: 1.7;
    font-weight: 400;
  }
  .post-content p  { margin: 0 0 8px; }
  .post-content p:last-child { margin-bottom: 0; }
  .post-content ul, .post-content ol { margin: 8px 0; padding-left: 22px; }
  .post-content li { margin-bottom: 4px; }
  .post-content strong { font-weight: 600; color: var(--ink); }
  .post-content em { font-style: italic; }
  .post-content blockquote {
    margin: 10px 0;
    padding: 8px 14px;
    border-left: 3px solid var(--accent);
    color: var(--ink-soft);
    background: var(--surface2);
    border-radius: 0 8px 8px 0;
    font-style: italic;
  }
  .post-content code {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 1px 6px;
    font-size: 12.5px;
    color: var(--accent);
    font-family: 'Fira Mono', 'Courier New', monospace;
  }

  .post-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    padding: 10px 20px 12px;
    border-top: 1px solid var(--border);
    background: var(--surface2);
  }
  .action-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    padding: 6px 12px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .action-btn:active { transform: scale(0.97); }
  .btn-edit  { background: rgba(108,59,255,0.1); color: var(--accent); }
  .btn-edit:hover  { background: rgba(108,59,255,0.18); }
  .btn-delete{ background: rgba(232,64,90,0.08); color: var(--accent2); }
  .btn-delete:hover{ background: rgba(232,64,90,0.16); }

  /* ── Modais ── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15,10,30,0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1400;
    animation: fadeIn 0.2s ease;
    padding: 16px;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal-box {
    background: var(--surface);
    border-radius: 20px;
    overflow: hidden;
    min-width: 340px;
    max-width: 540px;
    width: 100%;
    box-shadow: 0 32px 64px rgba(40,20,90,0.28);
    animation: popIn 0.25s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(0.92) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .modal-header {
    background: linear-gradient(135deg, #5c2eff, #8b5cff);
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .modal-title {
    font-family: 'Playfair Display', serif;
    font-size: 17px;
    color: #fff;
    margin: 0;
    font-weight: 700;
  }
  .modal-close {
    background: rgba(255,255,255,0.18);
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #fff;
    transition: background 0.15s;
  }
  .modal-close:hover { background: rgba(255,255,255,0.28); }
  .modal-body { padding: 20px; }

  .modal-textarea {
    width: 100%;
    min-height: 110px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1.5px solid var(--border);
    resize: vertical;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    color: var(--ink);
    background: var(--surface2);
    outline: none;
    line-height: 1.65;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .modal-textarea:focus { border-color: var(--accent); }

  .modal-btns {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 16px;
  }
  .btn-cancel {
    background: transparent;
    color: var(--ink-soft);
    border: 1.5px solid var(--border);
    border-radius: 9px;
    padding: 9px 16px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .btn-cancel:hover { background: var(--surface2); }
  .btn-save {
    display: flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, #6c3bff, #9b6dff);
    color: #fff;
    border: none;
    border-radius: 9px;
    padding: 9px 18px;
    font-family: 'Inter', sans-serif;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(108,59,255,0.3);
    transition: opacity 0.15s, transform 0.1s;
  }
  .btn-save:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-save-danger { background: linear-gradient(135deg, #e8405a, #ff7a8a) !important; box-shadow: 0 3px 10px rgba(232,64,90,0.3) !important; }

  /* ── Empty state ── */
  .empty-state {
    text-align: center;
    padding: 64px 20px;
    color: var(--ink-faint);
  }
  .empty-icon {
    font-size: 44px;
    margin-bottom: 12px;
    filter: grayscale(0.3);
  }
  .empty-text { font-size: 15px; }

  /* ── Tema escuro ── */
  html[data-theme="dark"] .mural-root {
    --ink:      #ede8ff;
    --ink-soft: #c4b8f5;
    --ink-faint:#7b6faa;
    --bg:       #0f0b1a;
    --surface:  #17142b;
    --surface2: #1e1a3a;
    --border:   rgba(120,100,200,0.28);
    --shadow:   0 2px 16px rgba(0,0,0,0.4);
    --shadow-md:0 8px 32px rgba(0,0,0,0.5);
  }
  html[data-theme="dark"] .compose-textarea,
  html[data-theme="dark"] .modal-textarea { color: #ede8ff !important; }
  html[data-theme="dark"] .mural-hero {
    background: linear-gradient(135deg, #1a0640 0%, #4a1fa8 55%, #6c3bff 100%);
  }
`;

export default function MuralPage() {
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isGestorOuAdmin = ["admin", "gestor", "gestor_delivery"].includes(user?.perfil);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      try {
        const res = await api.get("/mural");
        setPosts(res.data || []);
      } catch {
        setError("Erro ao carregar mural");
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  const [editIndex, setEditIndex] = useState(null);
  const [editConteudo, setEditConteudo] = useState("");
  const [novoPost, setNovoPost] = useState("");
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);
  const textAreaRef = useRef();

  function abrirModalEdicao(idx) {
    setEditIndex(idx);
    setEditConteudo(posts[idx].conteudo);
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    if (!editConteudo.trim()) return;
    try {
      const post = posts[editIndex];
      const res = await api.put(`/mural/${post.id}`, { conteudo: editConteudo.trim() });
      const novo = [...posts];
      novo[editIndex] = res.data;
      setPosts(novo);
      setEditIndex(null);
    } catch {
      setError("Erro ao salvar edição");
    }
  }

  const applyInlineFormat = (prefix, suffix = prefix) => {
    const node = textAreaRef.current;
    if (!node) return;
    const start = node.selectionStart ?? novoPost.length;
    const end = node.selectionEnd ?? novoPost.length;
    const selected = novoPost.slice(start, end) || "texto";
    const formatted = `${prefix}${selected}${suffix}`;
    const nextValue = `${novoPost.slice(0, start)}${formatted}${novoPost.slice(end)}`;
    setNovoPost(nextValue);
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  const applyLinePrefix = (prefix) => {
    const node = textAreaRef.current;
    if (!node) return;
    const start = node.selectionStart ?? novoPost.length;
    const end = node.selectionEnd ?? novoPost.length;
    const block = novoPost.slice(start, end) || "item";
    const prefixed = block.split("\n").map(l => l.trim() ? `${prefix}${l}` : l).join("\n");
    const nextValue = `${novoPost.slice(0, start)}${prefixed}${novoPost.slice(end)}`;
    setNovoPost(nextValue);
    requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(start, start + prefixed.length);
    });
  };

  async function publicar(e) {
    e.preventDefault();
    if (!novoPost.trim()) return;
    try {
      const res = await api.post("/mural", { autor: user?.nome || "Usuário", conteudo: novoPost });
      setPosts([res.data, ...posts]);
      setNovoPost("");
    } catch {
      setError("Erro ao publicar comunicado");
    }
  }

  async function excluirPostConfirmado(idx) {
    const post = posts[idx];
    try {
      await api.delete(`/mural/${post.id}`);
      setPosts(posts.filter((_, i) => i !== idx));
      setConfirmDeleteIndex(null);
    } catch {
      setError("Erro ao excluir comunicado");
      setConfirmDeleteIndex(null);
    }
  }

  const markdownComponents = {
    p: ({ children }) => <p style={{ margin: "0 0 8px", lineHeight: 1.7 }}>{children}</p>,
    ul: ({ children }) => <ul style={{ margin: "8px 0", paddingLeft: 22 }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ margin: "8px 0", paddingLeft: 22 }}>{children}</ol>,
    li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
    strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
    em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
    blockquote: ({ children }) => (
      <blockquote style={{ margin: "10px 0", padding: "8px 14px", borderLeft: "3px solid #6c3bff", background: "var(--surface2,#f0ebff)", borderRadius: "0 8px 8px 0", fontStyle: "italic" }}>{children}</blockquote>
    ),
    code: ({ children }) => (
      <code style={{ background: "var(--surface2,#f0ebff)", border: "1px solid var(--border,rgba(100,80,160,0.14))", borderRadius: 5, padding: "1px 6px", fontSize: 12.5, color: "#6c3bff", fontFamily: "monospace" }}>{children}</code>
    ),
  };

  const toolbarActions = [
    { icon: <Bold size={14} />, label: "Negrito",      action: () => applyInlineFormat("**") },
    { icon: <Italic size={14} />, label: "Itálico",    action: () => applyInlineFormat("*") },
    { icon: <Quote size={14} />, label: "Citação",     action: () => applyLinePrefix("> ") },
    { icon: <List size={14} />, label: "Lista",        action: () => applyLinePrefix("- ") },
    { icon: <ListOrdered size={14} />, label: "Lista numerada", action: () => applyLinePrefix("1. ") },
    { icon: <Code size={14} />, label: "Código",       action: () => applyInlineFormat("`") },
  ];

  const ACCENT_TOPS = [
    "linear-gradient(90deg, #6c3bff, #e8405a)",
    "linear-gradient(90deg, #0e5a7a, #6c3bff)",
    "linear-gradient(90deg, #1f7a3f, #0e5a7a)",
    "linear-gradient(90deg, #ff9500, #e8405a)",
    "linear-gradient(90deg, #9b1b5a, #6c3bff)",
  ];

  return (
    <div className="mural-root">
      <style>{css}</style>

      {/* ── Hero ── */}
      <div className="mural-hero">
        <div className="mural-hero-inner">
          <div>
            <h1 className="mural-title">Mural Interno</h1>
            <p className="mural-subtitle">{posts.length} comunicado{posts.length !== 1 ? "s" : ""} publicado{posts.length !== 1 ? "s" : ""}</p>
          </div>
          <span className="mural-badge">
            <Pin size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            NVX Fibra
          </span>
        </div>
      </div>

      {/* ── Corpo ── */}
      <div className="mural-body">

        {error && (
          <div style={{ margin: "0 0 16px", padding: "10px 14px", borderRadius: 10, background: "#fff1f2", border: "1px solid #ffc4cf", color: "#9b1f1f", fontSize: 13, fontWeight: 600 }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Compose ── */}
        {isGestorOuAdmin && (
          <form onSubmit={publicar} className="compose-box">
            <div className="compose-header">
              <div className="compose-user-avatar" style={{ background: avatarGradient(user?.nome) }}>
                {initials(user?.nome)}
              </div>
              <span className="compose-label">Novo comunicado</span>
            </div>
            <div className="compose-toolbar">
              {toolbarActions.map(({ icon, label, action }) => (
                <button key={label} type="button" title={label} onClick={action} className="toolbar-btn">
                  {icon}
                </button>
              ))}
            </div>
            <textarea
              ref={textAreaRef}
              placeholder="Escreva um aviso, regra ou comunicado… (Markdown suportado)"
              value={novoPost}
              onChange={e => setNovoPost(e.target.value)}
              className="compose-textarea"
            />
            <div className="compose-footer">
              {novoPost.length > 0 && (
                <span className="char-hint">{novoPost.length} caracteres</span>
              )}
              <button type="submit" className="publish-btn">
                <Send size={13} /> Publicar
              </button>
            </div>
          </form>
        )}

        {/* ── Posts ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink-faint)" }}>
            Carregando comunicados…
          </div>
        ) : (
          <div className="posts-list">
            {posts.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-text">Nenhum comunicado ainda.</div>
              </div>
            )}

            {posts.map((post, i) => (
              <div key={post.id || i} className={`post-card${i === 0 ? " post-card-featured" : ""}`}>
                {/* Topo colorido */}
                <div className="post-card-top" style={{ background: ACCENT_TOPS[i % ACCENT_TOPS.length] }} />

                <div className="post-card-body">
                  <div className="post-meta">
                    <div className="post-avatar" style={{ background: avatarGradient(post.autor) }}>
                      {initials(post.autor)}
                    </div>
                    <div className="post-author-block">
                      <div className="post-author">
                        {post.autor}
                        {i === 0 && <span className="post-featured-badge">📌 Recente</span>}
                      </div>
                      <div className="post-author-role">{relativeTime(post.data || post.createdAt)}</div>
                    </div>
                    <span className="post-date">
                      {new Date(post.data || post.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>

                  <div className="post-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {post.conteudo}
                    </ReactMarkdown>
                  </div>
                </div>

                {isGestorOuAdmin && (
                  <div className="post-actions">
                    <button className="action-btn btn-edit" onClick={() => abrirModalEdicao(i)}>
                      <Pencil size={12} /> Editar
                    </button>
                    <button className="action-btn btn-delete" onClick={() => setConfirmDeleteIndex(i)}>
                      <Trash2 size={12} /> Excluir
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal editar ── */}
      {editIndex !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditIndex(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Editar comunicado</h3>
              <button className="modal-close" onClick={() => setEditIndex(null)} type="button"><X size={14} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={salvarEdicao}>
                <textarea value={editConteudo} onChange={e => setEditConteudo(e.target.value)} className="modal-textarea" autoFocus />
                <div className="modal-btns">
                  <button type="button" onClick={() => setEditIndex(null)} className="btn-cancel">
                    <X size={12} /> Cancelar
                  </button>
                  <button type="submit" className="btn-save">
                    <Check size={12} /> Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar exclusão ── */}
      {confirmDeleteIndex !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDeleteIndex(null)}>
          <div className="modal-box">
            <div className="modal-header" style={{ background: "linear-gradient(135deg, #b00020, #e8405a)" }}>
              <h3 className="modal-title">Excluir comunicado</h3>
              <button className="modal-close" onClick={() => setConfirmDeleteIndex(null)} type="button"><X size={14} /></button>
            </div>
            <div className="modal-body">
              <p style={{ margin: "0 0 16px", color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6 }}>
                Tem certeza que deseja excluir este comunicado? Esta ação não poderá ser desfeita.
              </p>
              <div className="modal-btns">
                <button type="button" onClick={() => setConfirmDeleteIndex(null)} className="btn-cancel">
                  <X size={12} /> Cancelar
                </button>
                <button type="button" onClick={() => excluirPostConfirmado(confirmDeleteIndex)} className="btn-save btn-save-danger">
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
