import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import api from "../services/api";

// ─── Cores disponíveis para a nota ───────────────────────────────────────────
const CORES = [
  { value: "default", label: "Padrão",   bg: "var(--bg-card)",  dot: "#d1d5db" },
  { value: "amarelo", label: "Amarelo",  bg: "#fefce8",         dot: "#fbbf24" },
  { value: "rosa",    label: "Rosa",     bg: "#fff1f2",         dot: "#fb7185" },
  { value: "verde",   label: "Verde",    bg: "#f0fdf4",         dot: "#4ade80" },
  { value: "azul",    label: "Azul",     bg: "#eff6ff",         dot: "#60a5fa" },
  { value: "roxo",    label: "Roxo",     bg: "#faf5ff",         dot: "#c084fc" },
];
const getCor = (v) => CORES.find((c) => c.value === v) || CORES[0];

// ─── CSS do editor TipTap (injetado uma vez) ──────────────────────────────────
const EDITOR_CSS = `
.nota-editor .ProseMirror { outline: none; min-height: 280px; font-size: 15px; line-height: 1.75; color: var(--text); }
.nota-editor .ProseMirror > * + * { margin-top: 0.4em; }
.nota-editor .ProseMirror p { margin: 0; }
.nota-editor .ProseMirror h1 { font-size: 26px; font-weight: 800; margin: 18px 0 6px; color: var(--text); }
.nota-editor .ProseMirror h2 { font-size: 20px; font-weight: 700; margin: 14px 0 4px; color: var(--text); }
.nota-editor .ProseMirror h3 { font-size: 16px; font-weight: 700; margin: 12px 0 4px; color: var(--text); }
.nota-editor .ProseMirror ul,
.nota-editor .ProseMirror ol { padding-left: 22px; }
.nota-editor .ProseMirror li { margin: 2px 0; }
.nota-editor .ProseMirror blockquote { border-left: 3px solid #7c5cff; margin: 8px 0; padding: 4px 0 4px 16px; color: var(--text-label); font-style: italic; }
.nota-editor .ProseMirror code { background: var(--bg-input); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; font-family: monospace; font-size: 13px; }
.nota-editor .ProseMirror pre { background: var(--bg-input); border: 1px solid var(--border); border-radius: 10px; padding: 14px 18px; overflow-x: auto; }
.nota-editor .ProseMirror pre code { background: none; border: none; padding: 0; }
.nota-editor .ProseMirror hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
.nota-editor .ProseMirror p.is-editor-empty:first-child::before { content: "Comece a escrever…"; color: var(--text-label); opacity: 0.45; pointer-events: none; float: left; height: 0; }
`;

// ─── Botão da toolbar ─────────────────────────────────────────────────────────
function TB({ onClick, active, title, children }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        background: active ? "rgba(124,92,255,0.13)" : "transparent",
        border: active ? "1px solid rgba(124,92,255,0.3)" : "1px solid transparent",
        borderRadius: 6,
        color: active ? "#7c5cff" : "var(--text-label)",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 13,
        padding: "4px 7px",
        lineHeight: 1,
        minWidth: 26,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

const Sep = () => (
  <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 3px", flexShrink: 0 }} />
);

// ─── Item da lista de notas ───────────────────────────────────────────────────
function NotaItem({ nota, ativa, onClick }) {
  const cor = getCor(nota.cor);
  const preview = (nota.conteudo || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 75) || "Sem conteúdo";
  const bg = ativa ? "rgba(124,92,255,0.1)" : "transparent";
  const border = ativa ? "1px solid rgba(124,92,255,0.25)" : "1px solid transparent";
  const bl = ativa ? "3px solid #7c5cff" : nota.cor !== "default" ? `3px solid ${cor.dot}` : "3px solid transparent";

  return (
    <div
      onClick={onClick}
      style={{ padding: "10px 12px", borderRadius: 10, cursor: "pointer", background: bg, border, borderLeft: bl, transition: "background 150ms" }}
      onMouseEnter={(e) => { if (!ativa) e.currentTarget.style.background = "var(--bg-input)"; }}
      onMouseLeave={(e) => { if (!ativa) e.currentTarget.style.background = bg; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
        {nota.favorita && <span style={{ fontSize: 11, flexShrink: 0 }}>⭐</span>}
        {nota.cor !== "default" && (
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor.dot, flexShrink: 0, display: "inline-block" }} />
        )}
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {nota.titulo || "Sem título"}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-label)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preview}</div>
      <div style={{ fontSize: 10, color: "var(--text-label)", marginTop: 4, opacity: 0.65 }}>
        {new Date(nota.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Notas() {
  const [notas,       setNotas]       = useState([]);
  const [notaAtiva,   setNotaAtiva]   = useState(null);
  const [titulo,      setTitulo]      = useState("");
  const [busca,       setBusca]       = useState("");
  const [salvando,    setSalvando]    = useState(false);
  const [salvoEm,     setSalvoEm]     = useState(null);
  const [carregando,  setCarregando]  = useState(true);

  const saveTimer   = useRef(null);
  const tituloTimer = useRef(null);
  const notaAtivaRef = useRef(null);

  // mantém ref sempre atualizada para os closures do editor
  useEffect(() => { notaAtivaRef.current = notaAtiva; }, [notaAtiva]);

  // ── Editor ──────────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: "",
    onUpdate({ editor }) {
      if (!notaAtivaRef.current) return;
      agendarSave({ conteudo: editor.getHTML() });
    },
  });

  // ── Injetar CSS do editor ────────────────────────────────────────────────────
  useEffect(() => {
    const id = "nota-editor-css";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = EDITOR_CSS;
      document.head.appendChild(el);
    }
    return () => {};
  }, []);

  // ── Carregar notas ───────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get("/notas");
      setNotas(data);
    } catch {}
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Selecionar nota ──────────────────────────────────────────────────────────
  function selecionarNota(nota) {
    if (saveTimer.current)   clearTimeout(saveTimer.current);
    if (tituloTimer.current) clearTimeout(tituloTimer.current);
    setNotaAtiva(nota);
    setTitulo(nota.titulo || "");
    setSalvoEm(null);
    editor?.commands.setContent(nota.conteudo || "", false);
  }

  // ── Auto-save ────────────────────────────────────────────────────────────────
  function agendarSave(campos, delay = 800) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => salvar(campos), delay);
  }

  async function salvar(campos) {
    const atual = notaAtivaRef.current;
    if (!atual) return;
    setSalvando(true);
    try {
      const { data } = await api.put(`/notas/${atual.id}`, campos);
      setNotas((prev) => prev.map((n) => n.id === data.id ? data : n).sort((a, b) => {
        if (a.favorita !== b.favorita) return b.favorita - a.favorita;
        return new Date(b.updated_at) - new Date(a.updated_at);
      }));
      setNotaAtiva(data);
      setSalvoEm(new Date());
    } catch {}
    setSalvando(false);
  }

  // ── Título com debounce ──────────────────────────────────────────────────────
  function handleTituloChange(e) {
    const val = e.target.value;
    setTitulo(val);
    if (tituloTimer.current) clearTimeout(tituloTimer.current);
    tituloTimer.current = setTimeout(() => salvar({ titulo: val }), 600);
  }

  // ── Nova nota ────────────────────────────────────────────────────────────────
  async function novaNota() {
    try {
      const { data } = await api.post("/notas", { titulo: "", conteudo: "", cor: "default", favorita: false });
      setNotas((prev) => [data, ...prev]);
      selecionarNota(data);
    } catch {}
  }

  // ── Excluir ──────────────────────────────────────────────────────────────────
  async function excluirNota() {
    if (!notaAtiva || !window.confirm("Excluir esta nota permanentemente?")) return;
    try {
      await api.delete(`/notas/${notaAtiva.id}`);
      const restantes = notas.filter((n) => n.id !== notaAtiva.id);
      setNotas(restantes);
      setNotaAtiva(null);
      setTitulo("");
      editor?.commands.clearContent();
    } catch {}
  }

  // ── Favoritar ────────────────────────────────────────────────────────────────
  async function toggleFavorita() {
    if (!notaAtiva) return;
    await salvar({ favorita: !notaAtiva.favorita });
  }

  // ── Cor ──────────────────────────────────────────────────────────────────────
  async function mudarCor(cor) {
    await salvar({ cor });
  }

  // ── Filtro / agrupamento ─────────────────────────────────────────────────────
  const filtradas = notas.filter((n) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (n.titulo || "").toLowerCase().includes(q) ||
           (n.conteudo || "").replace(/<[^>]+>/g, "").toLowerCase().includes(q);
  });
  const favoritas = filtradas.filter((n) => n.favorita);
  const outras    = filtradas.filter((n) => !n.favorita);
  const corAtiva  = getCor(notaAtiva?.cor);

  return (
    <div style={{
      display: "flex",
      height: "calc(100vh - 62px - 40px)",
      background: "var(--bg-card)",
      borderRadius: 16,
      overflow: "hidden",
      border: "1px solid var(--border)",
      boxShadow: "0 2px 16px rgba(76,29,149,0.08)",
    }}>

      {/* ═══════════════════════ SIDEBAR ═══════════════════════ */}
      <div style={{
        width: 270, minWidth: 270, flexShrink: 0,
        display: "flex", flexDirection: "column",
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
      }}>
        {/* Cabeçalho sidebar */}
        <div style={{ padding: "16px 14px 10px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: "var(--text)", display: "flex", alignItems: "center", gap: 7 }}>
              📝 Notas
            </span>
            <button
              onClick={novaNota}
              title="Nova nota"
              style={{
                background: "linear-gradient(135deg, #7a4dff, #9d4edd)",
                color: "#fff", border: "none", borderRadius: 8,
                padding: "5px 12px", fontSize: 18, fontWeight: 700,
                cursor: "pointer", lineHeight: 1,
              }}
            >
              +
            </button>
          </div>
          <input
            type="text"
            placeholder="Pesquisar notas…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: "100%", padding: "7px 10px",
              borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--bg-input)", color: "var(--text)",
              fontSize: 12.5, boxSizing: "border-box", outline: "none",
            }}
          />
        </div>

        {/* Lista de notas */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {carregando && (
            <div style={{ textAlign: "center", padding: 30, color: "var(--text-label)", fontSize: 13 }}>Carregando…</div>
          )}

          {!carregando && notas.length === 0 && (
            <div style={{ textAlign: "center", padding: "50px 16px", color: "var(--text-label)" }}>
              <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>📄</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Nenhuma nota ainda</div>
              <button
                onClick={novaNota}
                style={{ background: "none", border: "none", color: "#7c5cff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
              >
                Criar primeira nota →
              </button>
            </div>
          )}

          {favoritas.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-label)", letterSpacing: "0.8px", padding: "8px 4px 4px", textTransform: "uppercase" }}>
                ⭐ Favoritas
              </div>
              {favoritas.map((n) => (
                <NotaItem key={n.id} nota={n} ativa={notaAtiva?.id === n.id} onClick={() => selecionarNota(n)} />
              ))}
            </>
          )}

          {outras.length > 0 && (
            <>
              {favoritas.length > 0 && (
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-label)", letterSpacing: "0.8px", padding: "10px 4px 4px", textTransform: "uppercase" }}>
                  Todas
                </div>
              )}
              {outras.map((n) => (
                <NotaItem key={n.id} nota={n} ativa={notaAtiva?.id === n.id} onClick={() => selecionarNota(n)} />
              ))}
            </>
          )}

          {!carregando && filtradas.length === 0 && notas.length > 0 && (
            <div style={{ textAlign: "center", padding: "30px 12px", color: "var(--text-label)", fontSize: 12 }}>
              Nenhuma nota encontrada.
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════ EDITOR ════════════════════════ */}
      {!notaAtiva ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--text-label)", background: "var(--bg-input)" }}>
          <div style={{ fontSize: 56, opacity: 0.2 }}>📝</div>
          <div style={{ fontSize: 16, fontWeight: 700, opacity: 0.4 }}>Selecione uma nota</div>
          <div style={{ fontSize: 13, opacity: 0.35, marginTop: -6 }}>ou crie uma nova</div>
          <button
            onClick={novaNota}
            style={{
              marginTop: 6,
              background: "linear-gradient(135deg, #7a4dff, #9d4edd)",
              color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(124,77,255,0.35)",
            }}
          >
            + Nova nota
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: corAtiva.bg, transition: "background 250ms" }}>

          {/* ── Barra de ferramentas ── */}
          <div style={{
            padding: "8px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
            background: "var(--bg-card)",
          }}>
            {editor && (
              <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, flexWrap: "wrap" }}>
                <TB onClick={() => editor.chain().focus().toggleBold().run()}            active={editor.isActive("bold")}           title="Negrito"><b>B</b></TB>
                <TB onClick={() => editor.chain().focus().toggleItalic().run()}          active={editor.isActive("italic")}         title="Itálico"><i>I</i></TB>
                <TB onClick={() => editor.chain().focus().toggleUnderline().run()}       active={editor.isActive("underline")}      title="Sublinhado"><u>U</u></TB>
                <TB onClick={() => editor.chain().focus().toggleStrike().run()}          active={editor.isActive("strike")}         title="Tachado"><s>S</s></TB>
                <Sep />
                <TB onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Título 1">H1</TB>
                <TB onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Título 2">H2</TB>
                <TB onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Título 3">H3</TB>
                <Sep />
                <TB onClick={() => editor.chain().focus().toggleBulletList().run()}     active={editor.isActive("bulletList")}     title="Lista com marcadores">• —</TB>
                <TB onClick={() => editor.chain().focus().toggleOrderedList().run()}    active={editor.isActive("orderedList")}    title="Lista numerada">1.</TB>
                <TB onClick={() => editor.chain().focus().toggleBlockquote().run()}     active={editor.isActive("blockquote")}     title="Citação">"</TB>
                <TB onClick={() => editor.chain().focus().toggleCode().run()}           active={editor.isActive("code")}           title="Código inline">{"`"}</TB>
                <TB onClick={() => editor.chain().focus().toggleCodeBlock().run()}      active={editor.isActive("codeBlock")}      title="Bloco de código">{"</>"}</TB>
                <TB onClick={() => editor.chain().focus().setHorizontalRule().run()}    active={false}                             title="Separador">—</TB>
                <Sep />
                <TB onClick={() => editor.chain().focus().undo().run()} active={false} title="Desfazer">↩</TB>
                <TB onClick={() => editor.chain().focus().redo().run()} active={false} title="Refazer">↪</TB>
              </div>
            )}

            {/* Controles direitos */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {/* Seletor de cor */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {CORES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => mudarCor(c.value)}
                    title={c.label}
                    style={{
                      width: 15, height: 15, borderRadius: "50%", padding: 0, cursor: "pointer",
                      background: c.dot,
                      border: notaAtiva.cor === c.value ? "2px solid #7c5cff" : "1.5px solid transparent",
                      outline: notaAtiva.cor === c.value ? "1px solid rgba(124,92,255,0.4)" : "none",
                    }}
                  />
                ))}
              </div>
              <Sep />
              {/* Favorita */}
              <button
                onClick={toggleFavorita}
                title={notaAtiva.favorita ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                style={{
                  background: notaAtiva.favorita ? "#fefce8" : "transparent",
                  border: notaAtiva.favorita ? "1px solid #fde68a" : "1px solid var(--border)",
                  borderRadius: 7, padding: "3px 7px", cursor: "pointer", fontSize: 14, lineHeight: 1,
                }}
              >
                {notaAtiva.favorita ? "⭐" : "☆"}
              </button>
              {/* Excluir */}
              <button
                onClick={excluirNota}
                title="Excluir nota"
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 7, padding: "3px 7px", cursor: "pointer", fontSize: 13, color: "#dc2626", lineHeight: 1 }}
              >
                🗑
              </button>
              {/* Status de salvamento */}
              <span style={{ fontSize: 11, color: salvando ? "#7c5cff" : "var(--text-label)", minWidth: 85, textAlign: "right", fontWeight: salvando ? 600 : 400 }}>
                {salvando
                  ? "Salvando…"
                  : salvoEm
                  ? `✓ ${salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                  : ""}
              </span>
            </div>
          </div>

          {/* ── Título ── */}
          <input
            type="text"
            value={titulo}
            onChange={handleTituloChange}
            placeholder="Sem título"
            style={{
              border: "none", outline: "none",
              padding: "26px 36px 10px",
              fontSize: 30, fontWeight: 800, letterSpacing: "-0.4px",
              color: "var(--text)",
              background: "transparent",
              width: "100%", boxSizing: "border-box",
            }}
          />

          {/* ── Área de texto ── */}
          <div
            className="nota-editor"
            style={{ flex: 1, overflowY: "auto", padding: "4px 36px 40px", cursor: "text" }}
            onClick={() => editor?.commands.focus()}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      )}
    </div>
  );
}
