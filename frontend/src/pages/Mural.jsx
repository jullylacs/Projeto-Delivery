import { useState, useRef, useEffect } from "react";
import api from "../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bold, Italic, List, ListOrdered, Quote, Code, Pin, Pencil, Trash2, Send, X, Check } from "lucide-react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  .mural-root {
    --ink: #1a1220;
    --ink-soft: #4a3d60;
    --ink-faint: #8b7faa;
    --bg: #ffffff;
    --surface: #fffefb;
    --surface2: #f0ebff;
    --accent: #7c4dff;
    --accent2: #e8405a;
    --accent3: #ff9500;
    --border: rgba(100, 80, 160, 0.15);
    --shadow: 0 2px 20px rgba(60, 30, 120, 0.08);
    --shadow-hover: 0 8px 40px rgba(60, 30, 120, 0.16);
    font-family: 'DM Sans', sans-serif;
    background: var(--bg);
    min-height: 100vh;
    padding: 48px 24px 80px;
  }

  .mural-inner {
    max-width: 680px;
    margin: 0 auto;
  }

  .mural-header {
    margin-bottom: 48px;
    display: flex;
    align-items: flex-end;
    gap: 16px;
  }

  .mural-title {
    font-family: 'Playfair Display', serif;
    font-size: 42px;
    font-weight: 700;
    color: var(--ink);
    line-height: 1;
    letter-spacing: -1px;
    flex: 1;
  }

  .mural-title span {
    color: var(--accent);
  }

  .mural-divider {
    width: 100%;
    height: 1.5px;
    background: linear-gradient(90deg, var(--accent) 0%, transparent 100%);
    margin-bottom: 40px;
    opacity: 0.4;
  }

  /* Compose Box */
  .compose-box {
    background: var(--surface);
    border-radius: 16px;
    border: 1.5px solid var(--border);
    box-shadow: var(--shadow);
    margin-bottom: 40px;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }

  .compose-box:focus-within {
    box-shadow: var(--shadow-hover);
    border-color: rgba(124, 77, 255, 0.3);
  }

  .compose-toolbar {
    display: flex;
    gap: 4px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
    flex-wrap: wrap;
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

  .toolbar-btn:hover {
    background: rgba(124, 77, 255, 0.12);
    color: var(--accent);
  }

  .compose-textarea {
    width: 100%;
    min-height: 90px;
    padding: 16px 18px;
    border: none;
    resize: vertical;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 300;
    color: var(--ink);
    background: transparent;
    outline: none;
    line-height: 1.6;
    box-sizing: border-box;
  }

  .compose-textarea::placeholder {
    color: var(--ink-faint);
    font-style: italic;
  }

  .compose-footer {
    display: flex;
    justify-content: flex-end;
    padding: 10px 14px;
    border-top: 1px solid var(--border);
  }

  .publish-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--ink);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 9px 20px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    letter-spacing: 0.3px;
    transition: background 0.15s, transform 0.1s;
  }

  .publish-btn:hover {
    background: var(--accent);
    transform: translateY(-1px);
  }

  .publish-btn:active {
    transform: translateY(0);
  }

  /* Posts */
  .posts-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .post-card {
    background: var(--surface);
    border-radius: 16px;
    border: 1.5px solid var(--border);
    box-shadow: var(--shadow);
    overflow: hidden;
    transition: box-shadow 0.2s, transform 0.2s;
    animation: slideIn 0.3s ease both;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .post-card:hover {
    box-shadow: var(--shadow-hover);
    transform: translateY(-2px);
  }

  .post-card-accent {
    height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
  }

  .post-card-body {
    padding: 20px 22px 16px;
  }

  .post-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .post-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .post-author {
    font-weight: 500;
    font-size: 14px;
    color: var(--ink);
  }

  .post-date {
    font-size: 12px;
    color: var(--ink-faint);
    margin-left: auto;
    font-weight: 300;
  }

  .post-pin {
    color: var(--accent3);
    margin-left: 4px;
  }

  .post-content {
    font-size: 15px;
    color: var(--ink-soft);
    line-height: 1.65;
    font-weight: 300;
  }

  .post-content p { margin: 0 0 6px; }
  .post-content ul, .post-content ol { margin: 6px 0; padding-left: 22px; }
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
    font-size: 13px;
    color: var(--accent);
    font-family: 'Fira Mono', monospace;
  }

  .post-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 10px 22px 14px;
    border-top: 1px solid var(--border);
    background: rgba(240,235,255,0.4);
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 500;
    border: none;
    border-radius: 6px;
    padding: 5px 12px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.1s;
  }

  .action-btn:active { transform: scale(0.97); }

  .btn-edit {
    background: rgba(124, 77, 255, 0.1);
    color: var(--accent);
  }
  .btn-edit:hover { background: rgba(124, 77, 255, 0.2); }

  .btn-delete {
    background: rgba(232, 64, 90, 0.08);
    color: var(--accent2);
  }
  .btn-delete:hover { background: rgba(232, 64, 90, 0.18); }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 10, 30, 0.45);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-box {
    background: var(--surface);
    border-radius: 18px;
    padding: 32px;
    min-width: 340px;
    max-width: 540px;
    width: 90%;
    box-shadow: 0 24px 80px rgba(60, 30, 120, 0.25);
    animation: popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.9) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    color: var(--ink);
    margin: 0 0 20px;
  }

  .modal-textarea {
    width: 100%;
    min-height: 100px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1.5px solid var(--border);
    resize: vertical;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 300;
    color: var(--ink);
    background: var(--bg);
    outline: none;
    line-height: 1.6;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }

  .modal-textarea:focus {
    border-color: var(--accent);
  }

  .modal-btns {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 18px;
  }

  .btn-cancel {
    background: var(--bg);
    color: var(--ink-soft);
    border: 1.5px solid var(--border);
    border-radius: 8px;
    padding: 9px 18px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-cancel:hover { background: var(--surface2); }

  .btn-save {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 9px 20px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .btn-save:hover { background: #6535e8; transform: translateY(-1px); }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--ink-faint);
  }
  .empty-state-icon { font-size: 36px; margin-bottom: 12px; }
  .empty-state-text { font-size: 15px; font-style: italic; }
`;

export default function MuralPage() {
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isGestorOuAdmin = ["admin", "gestor"].includes(user?.perfil);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
    // Buscar posts do mural ao carregar
    useEffect(() => {
      async function fetchPosts() {
        setLoading(true);
        setError("");
        try {
          const res = await api.get("/mural");
          setPosts(res.data || []);
        } catch (err) {
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
  const textAreaRef = useRef();

  function getInitial(name) {
    return (name || "?")[0].toUpperCase();
  }

  function abrirModalEdicao(idx) {
    setEditIndex(idx);
    setEditConteudo(posts[idx].conteudo);
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    if (!editConteudo.trim()) return;
    setError("");
    try {
      const post = posts[editIndex];
      const res = await api.put(`/mural/${post.id}`, { conteudo: editConteudo.trim() });
      const novo = [...posts];
      novo[editIndex] = res.data;
      setPosts(novo);
      setEditIndex(null);
    } catch (err) {
      setError("Erro ao salvar edição");
    }
  }

  function fecharModal() {
    setEditIndex(null);
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
    setError("");
    try {
      const res = await api.post("/mural", {
        autor: user?.nome || "Usuário",
        conteudo: novoPost
      });
      setPosts([res.data, ...posts]);
      setNovoPost("");
    } catch (err) {
      setError("Erro ao publicar comunicado");
    }
  }

  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);
  async function excluirPostConfirmado(idx) {
    setError("");
    const post = posts[idx];
    try {
      await api.delete(`/mural/${post.id}`);
      setPosts(posts.filter((_, i) => i !== idx));
      setConfirmDeleteIndex(null);
    } catch (err) {
      setError("Erro ao excluir comunicado");
      setConfirmDeleteIndex(null);
    }
  }

  const markdownComponents = {
    p: ({ children }) => <p style={{ margin: "0 0 6px", lineHeight: 1.65 }}>{children}</p>,
    ul: ({ children }) => <ul style={{ margin: "6px 0", paddingLeft: 22 }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ margin: "6px 0", paddingLeft: 22 }}>{children}</ol>,
    li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
    strong: ({ children }) => <strong style={{ fontWeight: 600, color: "#1a1220" }}>{children}</strong>,
    em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
    blockquote: ({ children }) => (
      <blockquote style={{ margin: "10px 0", padding: "8px 14px", borderLeft: "3px solid #7c4dff", background: "#f0ebff", borderRadius: "0 8px 8px 0", fontStyle: "italic" }}>{children}</blockquote>
    ),
    code: ({ children }) => (
      <code style={{ background: "#f0ebff", border: "1px solid rgba(100,80,160,0.15)", borderRadius: 5, padding: "1px 6px", fontSize: 13, color: "#7c4dff" }}>{children}</code>
    ),
  };

  return (
    <div className="mural-root">
      <style>{styles}</style>

      <div className="mural-inner">
        <div className="mural-header">
          <h1 className="mural-title">Mural <span>Interno</span></h1>
          <Pin size={20} color="#7c4dff" style={{ marginBottom: 8, opacity: 0.6 }} />
        </div>
        <div className="mural-divider" />

        {isGestorOuAdmin && (
          <form onSubmit={publicar} className="compose-box">
            <div className="compose-toolbar">
              {[
                { icon: <Bold size={14} />, label: "Negrito", action: () => applyInlineFormat("**") },
                { icon: <Italic size={14} />, label: "Itálico", action: () => applyInlineFormat("*") },
                { icon: <Quote size={14} />, label: "Citação", action: () => applyLinePrefix("> ") },
                { icon: <List size={14} />, label: "Lista", action: () => applyLinePrefix("- ") },
                { icon: <ListOrdered size={14} />, label: "Lista num.", action: () => applyLinePrefix("1. ") },
                { icon: <Code size={14} />, label: "Código", action: () => applyInlineFormat("`") },
              ].map(({ icon, label, action }) => (
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
              <button type="submit" className="publish-btn">
                <Send size={14} /> Publicar
              </button>
            </div>
          </form>
        )}

        <div className="posts-list">
          {posts.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">Nenhum comunicado ainda.</div>
            </div>
          )}

          {posts.map((post, i) => (
            <div key={post.id || i} className="post-card">
              <div className="post-card-accent" style={{ background: i === 0 ? "linear-gradient(90deg, #7c4dff, #e8405a)" : "linear-gradient(90deg, #4a3d60, #7c4dff)" }} />
              <div className="post-card-body">
                <div className="post-meta">
                  <div className="post-avatar">{getInitial(post.autor)}</div>
                  <span className="post-author">{post.autor}</span>
                  {i === 0 && <Pin size={12} className="post-pin" />}
                  <span className="post-date">{post.data}</span>
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
      </div>

      {editIndex !== null && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && fecharModal()}>
          <div className="modal-box">
            <h3 className="modal-title">Editar comunicado</h3>
            <form onSubmit={salvarEdicao}>
              <textarea
                value={editConteudo}
                onChange={e => setEditConteudo(e.target.value)}
                placeholder="Conteúdo do comunicado"
                className="modal-textarea"
                autoFocus
              />
              <div className="modal-btns">
                <button type="button" onClick={fecharModal} className="btn-cancel">
                  <X size={13} style={{ display: "inline", marginRight: 4 }} />Cancelar
                </button>
                <button type="submit" className="btn-save">
                  <Check size={13} /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDeleteIndex !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmDeleteIndex(null)}>
          <div className="modal-box">
            <h3 className="modal-title">Excluir comunicado</h3>
            <p>Tem certeza que deseja excluir este comunicado? Esta ação não poderá ser desfeita.</p>
            <div className="modal-btns">
              <button type="button" onClick={() => setConfirmDeleteIndex(null)} className="btn-cancel">
                <X size={13} style={{ display: "inline", marginRight: 4 }} />Cancelar
              </button>
              <button type="button" onClick={() => excluirPostConfirmado(confirmDeleteIndex)} className="btn-save" style={{background: 'var(--accent2)'}}>
                <Trash2 size={13} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}