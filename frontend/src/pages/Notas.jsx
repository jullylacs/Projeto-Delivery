import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";
import { Node, Mark, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, ListTodo, Quote, Code, Code2, Minus, Undo2, Redo2, ChevronDown, Highlighter } from "lucide-react";
import api from "../services/api";

// ─── Cores ────────────────────────────────────────────────────────────────────
const CORES = [
  { value: "default", label: "Padrão",  bg: "var(--bg-card)",          dot: "#d1d5db" },
  { value: "amarelo", label: "Amarelo", bg: "rgba(251,191,36,0.09)",   dot: "#fbbf24" },
  { value: "rosa",    label: "Rosa",    bg: "rgba(251,113,133,0.09)",  dot: "#fb7185" },
  { value: "verde",   label: "Verde",   bg: "rgba(74,222,128,0.09)",   dot: "#4ade80" },
  { value: "azul",    label: "Azul",    bg: "rgba(96,165,250,0.09)",   dot: "#60a5fa" },
  { value: "roxo",    label: "Roxo",    bg: "rgba(192,132,252,0.09)",  dot: "#c084fc" },
];
const getCor = (v) => CORES.find((c) => c.value === v) || CORES[0];

const TEXT_COLORS    = ["#1a1a1a","#6b7280","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899"];
const HIGHLIGHT_COLS = [
  "rgba(253,224,71,0.45)",   // amarelo
  "rgba(74,222,128,0.35)",   // verde
  "rgba(96,165,250,0.38)",   // azul
  "rgba(248,113,113,0.40)",  // vermelho
  "rgba(192,132,252,0.38)",  // roxo
];

// ─── CSS ──────────────────────────────────────────────────────────────────────
const EDITOR_CSS = `
.nota-editor .ProseMirror { outline:none; min-height:360px; font-size:15.5px; line-height:1.8; color:var(--text); }
.nota-editor .ProseMirror > * + * { margin-top:0.5em; }
.nota-editor .ProseMirror p { margin:0; }
.nota-editor .ProseMirror h1 { font-size:28px; font-weight:800; margin:20px 0 6px; }
.nota-editor .ProseMirror h2 { font-size:21px; font-weight:700; margin:16px 0 4px; }
.nota-editor .ProseMirror h3 { font-size:17px; font-weight:700; margin:12px 0 4px; }
.nota-editor .ProseMirror ul,.nota-editor .ProseMirror ol { padding-left:24px; }
.nota-editor .ProseMirror li { margin:3px 0; }
.nota-editor .ProseMirror blockquote { border-left:4px solid #7c5cff; margin:10px 0; padding:6px 0 6px 18px; color:var(--text-label); font-style:italic; background:rgba(124,92,255,0.04); border-radius:0 8px 8px 0; }
.nota-editor .ProseMirror code { background:var(--bg-input); border:1px solid var(--border); border-radius:5px; padding:2px 6px; font-family:monospace; font-size:13.5px; }
.nota-editor .ProseMirror pre { background:var(--bg-input); border:1px solid var(--border); border-radius:12px; padding:18px 22px; overflow-x:auto; }
.nota-editor .ProseMirror pre code { background:none; border:none; padding:0; color:var(--text); font-size:13.5px; }
.nota-editor .ProseMirror hr { border:none; border-top:2px solid var(--border); margin:16px 0; }
.nota-editor .ProseMirror p.is-editor-empty:first-child::before { content:"Comece a escrever ou clique em ➕ Inserir bloco…"; color:var(--text-label); opacity:0.4; pointer-events:none; float:left; height:0; }
.nota-editor .ProseMirror img { max-width:100%; border-radius:12px; margin:10px 0; display:block; box-shadow:0 3px 16px rgba(0,0,0,.10); }
.nota-editor .ProseMirror a { color:#7c5cff; text-decoration:underline; cursor:pointer; }
.nota-editor .ProseMirror mark { border-radius:3px; padding:1px 2px; }
html[data-theme="dark"] .nota-editor .ProseMirror mark { filter: brightness(0.55) saturate(2); }
.nota-editor .ProseMirror ul[data-type="taskList"] { list-style:none; padding-left:2px; }
.nota-editor .ProseMirror div[data-callout] { border-radius:12px; padding:14px 18px; margin:12px 0; border-left:4px solid; }
.nota-editor .ProseMirror div[data-callout][data-callout-type="info"]    { border-color:#3b82f6; background:rgba(59,130,246,0.10); color:var(--text); }
.nota-editor .ProseMirror div[data-callout][data-callout-type="warning"] { border-color:#f59e0b; background:rgba(245,158,11,0.10); color:var(--text); }
.nota-editor .ProseMirror div[data-callout][data-callout-type="success"] { border-color:#10b981; background:rgba(16,185,129,0.10); color:var(--text); }
.nota-editor .ProseMirror div[data-callout][data-callout-type="error"]   { border-color:#ef4444; background:rgba(239,68,68,0.10);  color:var(--text); }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Extensões customizadas ───────────────────────────────────────────────────
/*
 * Por que extensões customizadas em vez dos pacotes oficiais?
 *
 * Os pacotes @tiptap/extension-task-item, @tiptap/extension-task-list,
 * @tiptap/extension-link, @tiptap/extension-image, @tiptap/extension-highlight
 * e @tiptap/extension-color dependem de @tiptap/core >= 2.x e têm peer
 * dependencies específicas. A versão instalada (@tiptap/core 2.27.2) apresenta
 * incompatibilidade de API com esses pacotes: os métodos de registro de
 * extensão mudaram entre minor versions e as extensões do npm travavam o editor
 * ou geravam erros de tipo silenciosos.
 *
 * A solução foi implementar cada extensão diretamente usando Node.create() /
 * Mark.create() da API pública do core — que é estável — evitando a cadeia
 * de peer deps problemática.
 *
 * ATENÇÃO: se @tiptap/core for atualizado, verifique se os pacotes oficiais
 * passam a ser compatíveis e considere substituir estas implementações.
 */

// Task item
function TaskItemView({ node, updateAttributes }) {
  return (
    <NodeViewWrapper as="li" data-type="taskItem" style={{ display:"flex", alignItems:"flex-start", gap:8, margin:"3px 0" }}>
      <input type="checkbox" contentEditable={false} checked={!!node.attrs.checked}
        onChange={() => updateAttributes({ checked: !node.attrs.checked })}
        style={{ accentColor:"#7c5cff", marginTop:5, flexShrink:0, cursor:"pointer", width:15, height:15 }} />
      <NodeViewContent style={{ flex:1, textDecoration:node.attrs.checked?"line-through":"none", opacity:node.attrs.checked?0.45:1, transition:"opacity 150ms" }} />
    </NodeViewWrapper>
  );
}
const CustomTaskItem = Node.create({
  name:"taskItem", group:"listItem", content:"paragraph+", defining:true,
  addAttributes() {
    return {
      /*
       * `parseHTML` e `renderHTML` são obrigatórios para persistência dos atributos.
       * Sem eles, o ProseMirror serializa o nó para HTML mas não lê o atributo
       * de volta ao carregar — ou seja, ao salvar e recarregar a nota, todos os
       * checkboxes voltariam para o estado padrão (false). O par parse/render
       * garante que `data-checked` sobreviva ao ciclo salvar → banco → recarregar.
       */
      checked:{ default:false, parseHTML:el=>el.dataset.checked==="true", renderHTML:attrs=>({ "data-checked":String(attrs.checked) }) }
    };
  },
  parseHTML() { return [{ tag:'li[data-type="taskItem"]' }]; },
  renderHTML({ node, HTMLAttributes }) { return ["li", mergeAttributes({ "data-type":"taskItem" }, HTMLAttributes), 0]; },
  /*
   * `ReactNodeViewRenderer` monta um componente React dentro do nó ProseMirror,
   * permitindo usar JSX, hooks e estado para renderizar o checkbox interativo.
   * Sem isso, teríamos que manipular o DOM diretamente via spec de NodeView.
   *
   * `stopEvent: () => false` — por padrão, NodeViews do TipTap interceptam
   * todos os eventos DOM do nó e os impedem de chegar ao ProseMirror. Isso
   * quebraria o onChange do <input type="checkbox">, que nunca dispararia.
   * Retornar false diz ao TipTap para NÃO interceptar eventos, deixando o
   * React tratar o onChange normalmente.
   */
  addNodeView() { return ReactNodeViewRenderer(TaskItemView, { stopEvent: () => false }); },
  addKeyboardShortcuts() { return { Enter:()=>this.editor.commands.splitListItem(this.name), Tab:()=>this.editor.commands.sinkListItem(this.name), "Shift-Tab":()=>this.editor.commands.liftListItem(this.name) }; },
});
const CustomTaskList = Node.create({
  name:"taskList", group:"block", content:"taskItem+",
  parseHTML() { return [{ tag:'ul[data-type="taskList"]' }]; },
  renderHTML() { return ["ul",{ "data-type":"taskList" },0]; },
  addCommands() { return { toggleTaskList:()=>({ commands })=>commands.toggleList(this.name,"taskItem") }; },
  addKeyboardShortcuts() { return { "Mod-Shift-9":()=>this.editor.commands.toggleTaskList() }; },
});

// Link
const CustomLink = Mark.create({
  name:"link", inclusive:false,
  addAttributes() {
    return {
      /*
       * Mesmo padrão de parseHTML + renderHTML: sem ele, salvar uma nota com
       * link e recarregá-la perderia o href e o target (o texto ficaria, mas
       * o link seria quebrado). Os guards `? ... : {}` evitam emitir atributos
       * vazios no HTML serializado.
       */
      href:   { default:null,     parseHTML: el => el.getAttribute("href"),   renderHTML: attrs => attrs.href   ? { href:   attrs.href   } : {} },
      target: { default:"_blank", parseHTML: el => el.getAttribute("target"), renderHTML: attrs => attrs.target ? { target: attrs.target } : {} },
    };
  },
  parseHTML() { return [{ tag:"a[href]" }]; },
  renderHTML({ HTMLAttributes }) { return ["a", mergeAttributes({ rel:"noopener noreferrer" }, HTMLAttributes), 0]; },
  addCommands() { return { setLink:(attrs)=>({ commands })=>commands.setMark(this.name,attrs), unsetLink:()=>({ commands })=>commands.unsetMark(this.name) }; },
});

// Imagem
const CustomImage = Node.create({
  name:"image", group:"block", atom:true, draggable:true,
  addAttributes() {
    return {
      src: { default:null, parseHTML: el => el.getAttribute("src"), renderHTML: attrs => ({ src: attrs.src }) },
      alt: { default:"",   parseHTML: el => el.getAttribute("alt"), renderHTML: attrs => ({ alt: attrs.alt }) },
    };
  },
  parseHTML() { return [{ tag:"img[src]" }]; },
  renderHTML({ HTMLAttributes }) { return ["img", mergeAttributes(HTMLAttributes)]; },
  addCommands() { return { setImage:(opts)=>({ commands })=>commands.insertContent({ type:this.name, attrs:opts }) }; },
});

// Highlight
const CustomHighlight = Mark.create({
  name:"highlight",
  addAttributes() { return { color:{ default:"#fef08a", parseHTML:el=>el.style.backgroundColor||"#fef08a", renderHTML:attrs=>({ style:`background-color:${attrs.color||"#fef08a"}` }) } }; },
  parseHTML() { return [{ tag:"mark" }]; },
  renderHTML({ HTMLAttributes }) { return ["mark", mergeAttributes(HTMLAttributes), 0]; },
  addCommands() { return { setHighlight:(attrs)=>({ commands })=>commands.setMark(this.name,attrs), unsetHighlight:()=>({ commands })=>commands.unsetMark(this.name) }; },
});

// Cor do texto
const CustomColor = Mark.create({
  name:"textColor",
  addAttributes() { return { color:{ default:null, parseHTML:el=>el.style.color||null, renderHTML:attrs=>attrs.color?{ style:`color:${attrs.color}` }:{} } }; },
  parseHTML() { return [{ tag:"span[style*='color']" }]; },
  renderHTML({ HTMLAttributes }) { return ["span", mergeAttributes(HTMLAttributes), 0]; },
  addCommands() { return { setColor:(color)=>({ commands })=>commands.setMark(this.name,{ color }), unsetColor:()=>({ commands })=>commands.unsetMark(this.name) }; },
});

// Callout
const CalloutExtension = Node.create({
  name:"callout", group:"block", content:"block+", defining:true,
  addAttributes() { return { type:{ default:"info", parseHTML:el=>el.getAttribute("data-callout-type"), renderHTML:attrs=>({ "data-callout-type":attrs.type }) } }; },
  parseHTML() { return [{ tag:"div[data-callout]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes({ "data-callout":"" }, HTMLAttributes), 0]; },
  addCommands() { return { insertCallout:(type="info")=>({ commands })=>commands.insertContent({ type:this.name, attrs:{ type }, content:[{ type:"paragraph" }] }) }; },
});




// ─── TABELA customizada (totalmente editável) ─────────────────────────────────
const DEFAULT_TABLE = { hasHeader:true, rows:[["Coluna 1","Coluna 2","Coluna 3"],["","",""],["","",""]] };

/*
 * Por que variável de módulo em vez de contexto React ou prop?
 *
 * O `TableView` (e o `ChartView`) são renderizados pelo `ReactNodeViewRenderer`
 * do TipTap, que cria raízes React separadas do árvore do componente `Notas`.
 * Isso significa que não há Provider/Context disponível dentro das node views —
 * elas estão "fora" da hierarquia. Usar useContext ou passar props seria
 * impossível sem refatorar o TipTap internamente.
 *
 * A solução é uma variável de módulo (singleton no bundle) que o componente
 * `Notas` preenche no useEffect de montagem. Quando a node view quer abrir
 * o modal, chama a função armazenada aqui, que dispara o setState no `Notas`.
 *
 * Atenção: se houver múltiplas instâncias do editor na mesma página (improvável
 * aqui, mas possível), apenas a última a montar sobrescreverá o callback.
 */
let _openTableModal = null;

// TableView: apenas exibição — edição acontece no modal externo
function TableView({ node, updateAttributes }) {
  const table = useMemo(() => {
    try { return JSON.parse(node.attrs.data); } catch { return DEFAULT_TABLE; }
  }, [node.attrs.data]);

  const cols = table.rows[0]?.length || 3;

  return (
    <NodeViewWrapper>
      <div contentEditable={false} style={{ margin:"12px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <span style={{ fontSize:12, fontWeight:800, color:"var(--text-label)", textTransform:"uppercase", letterSpacing:"0.7px" }}>⊞ Tabela</span>
          <button
            onClick={() => _openTableModal?.(table, (newTable) => updateAttributes({ data: JSON.stringify(newTable) }))}
            style={{ fontSize:11.5, padding:"3px 10px", borderRadius:6, border:"1px solid var(--border)", background:"var(--bg-card)", cursor:"pointer", color:"var(--text-label)", fontWeight:600 }}
          >✏ Editar tabela</button>
        </div>
        <div style={{ overflowX:"auto", borderRadius:10, border:"1px solid var(--border)" }}>
          <table style={{ borderCollapse:"collapse", width:"100%", tableLayout:"fixed", minWidth:`${cols*100}px` }}>
            <tbody>
              {table.rows.map((row, r) => {
                const isH = r === 0 && table.hasHeader;
                const Tag = isH ? "th" : "td";
                return (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <Tag key={c} style={{ border:"1px solid var(--border)", padding:"8px 11px", background:isH?"rgba(124,92,255,0.07)":"transparent", fontSize:isH?13:14, fontWeight:isH?700:400, textAlign:"left", verticalAlign:"top", color:"var(--text)", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                        {cell || <span style={{ opacity:0.2, fontStyle:"italic" }}>{isH?"Cabeçalho":"—"}</span>}
                      </Tag>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

/*
 * Por que o modal de edição fica FORA do editor (não dentro de TableView)?
 *
 * O ProseMirror chama `preventDefault()` em todos os eventos `mousedown` que
 * ocorrem dentro do DOM do editor. Isso impede que inputs de texto dentro
 * de uma node view recebam foco — clicar em um <input> dentro do editor
 * simplesmente não funcionaria. Renderizar o modal como portal fora do
 * ProseMirror contorna esse problema completamente.
 */
// Modal de edição da tabela — fora do DOM do editor
function TableEditModal({ data, onSave, onClose }) {
  const [table, setTable] = useState(() => JSON.parse(JSON.stringify(data)));

  const updateCell = (r, c, val) =>
    setTable(t => ({ ...t, rows: t.rows.map((row,ri) => ri===r ? row.map((cell,ci) => ci===c ? val : cell) : row) }));
  const addRow = () =>
    setTable(t => ({ ...t, rows: [...t.rows, Array(t.rows[0]?.length||3).fill("")] }));
  const addCol = () =>
    setTable(t => ({ ...t, rows: t.rows.map(row => [...row,""]) }));
  const removeRow = (r) => {
    if (table.rows.length <= 1) return;
    setTable(t => ({ ...t, rows: t.rows.filter((_,ri) => ri!==r) }));
  };
  const removeCol = (c) => {
    if ((table.rows[0]?.length||0) <= 1) return;
    setTable(t => ({ ...t, rows: t.rows.map(row => row.filter((_,ci) => ci!==c)) }));
  };

  const cols = table.rows[0]?.length || 3;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.35)", backdropFilter:"blur(3px)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--bg-card)", borderRadius:18, padding:24, width:"min(720px,96vw)", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 24px 60px rgba(40,20,80,0.22)", border:"1px solid var(--border)" }}>
        {/* Cabeçalho */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <span style={{ fontWeight:800, fontSize:17, color:"var(--text)" }}>⊞ Editar tabela</span>
          <button onClick={onClose} style={{ background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:8, cursor:"pointer", fontSize:16, color:"var(--text-label)", width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Controles */}
        <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
          <button onClick={addRow} style={{ padding:"5px 12px", borderRadius:7, border:"1px solid var(--border)", background:"var(--bg-input)", cursor:"pointer", fontSize:12.5, fontWeight:600, color:"var(--text-label)" }}>+ Linha</button>
          <button onClick={addCol} style={{ padding:"5px 12px", borderRadius:7, border:"1px solid var(--border)", background:"var(--bg-input)", cursor:"pointer", fontSize:12.5, fontWeight:600, color:"var(--text-label)" }}>+ Coluna</button>
          <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, cursor:"pointer", color:"var(--text-label)", userSelect:"none" }}>
            <input type="checkbox" checked={table.hasHeader} onChange={e => setTable(t => ({ ...t, hasHeader:e.target.checked }))} style={{ accentColor:"#7c5cff", cursor:"pointer" }} />
            Linha de cabeçalho
          </label>
          <span style={{ fontSize:11.5, color:"var(--text-label)", opacity:0.6, marginLeft:"auto" }}>Tab para próxima célula</span>
        </div>

        {/* Tabela editável */}
        <div style={{ overflowX:"auto", borderRadius:10, border:"1px solid var(--border)" }}>
          <table style={{ borderCollapse:"collapse", width:"100%", tableLayout:"fixed", minWidth:`${cols*110}px` }}>
            <colgroup>
              {table.rows[0]?.map((_,c) => <col key={c} style={{ width:`${100/cols}%` }} />)}
              <col style={{ width:28 }} />
            </colgroup>
            <tbody>
              {table.rows.map((row, r) => {
                const isH = r === 0 && table.hasHeader;
                return (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} style={{ border:"1px solid var(--border)", padding:0, background:isH?"rgba(124,92,255,0.06)":"transparent", verticalAlign:"top", position:"relative" }}>
                        {r === 0 && (
                          <button onClick={() => removeCol(c)} title="Remover coluna"
                            style={{ position:"absolute", top:2, right:2, width:16, height:16, borderRadius:3, border:"none", background:"#fee2e2", color:"#dc2626", fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1, zIndex:1, opacity:0.7 }}>✕</button>
                        )}
                        <textarea
                          value={cell}
                          onChange={e => updateCell(r, c, e.target.value)}
                          onKeyDown={e => { if (e.key==="Tab") { e.preventDefault(); const next = c < row.length-1 ? { r,c:c+1 } : r < table.rows.length-1 ? { r:r+1, c:0 } : null; if (next) { const el = document.querySelector(`[data-cell="${next.r}-${next.c}"]`); el?.focus(); } } }}
                          data-cell={`${r}-${c}`}
                          rows={1}
                          placeholder={isH ? "Cabeçalho" : ""}
                          style={{ width:"100%", border:"none", padding:isH?"9px 11px":"8px 11px", background:"transparent", fontSize:isH?13:14, fontWeight:isH?700:400, color:"var(--text)", resize:"none", fontFamily:"inherit", boxSizing:"border-box", outline:"none", lineHeight:1.5, minHeight:36, display:"block" }}
                          onFocus={e => { e.currentTarget.style.background="rgba(124,92,255,0.05)"; e.currentTarget.style.outline="2px solid #7c5cff"; e.currentTarget.style.outlineOffset="-2px"; }}
                          onBlur={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.outline="none"; }}
                        />
                      </td>
                    ))}
                    <td style={{ width:28, border:"none", padding:0, verticalAlign:"middle" }}>
                      <button onClick={() => removeRow(r)} title="Remover linha"
                        style={{ width:20, height:20, margin:"0 4px", background:"transparent", border:"none", cursor:"pointer", color:"#dc2626", fontSize:11, borderRadius:4, opacity:0.5, display:"flex", alignItems:"center", justifyContent:"center" }}
                        onMouseEnter={e => e.currentTarget.style.opacity="1"}
                        onMouseLeave={e => e.currentTarget.style.opacity="0.5"}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Botões */}
        <div style={{ display:"flex", gap:10, marginTop:18 }}>
          <button onClick={() => onSave(table)}
            style={{ flex:1, padding:"10px", borderRadius:10, background:"linear-gradient(135deg,#7a4dff,#9d4edd)", color:"#fff", border:"none", cursor:"pointer", fontWeight:700, fontSize:14, boxShadow:"0 3px 10px rgba(124,77,255,0.3)" }}>
            ✓ Salvar tabela
          </button>
          <button onClick={onClose}
            style={{ padding:"10px 16px", borderRadius:10, background:"var(--bg-input)", border:"1px solid var(--border)", cursor:"pointer", fontSize:14, color:"var(--text-label)" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

const TableExtension = Node.create({
  name:"customTable", group:"block", atom:true,
  addAttributes() {
    return {
      data: {
        default: JSON.stringify(DEFAULT_TABLE),
        parseHTML: (el) => el.getAttribute("data-custom-table"),
        renderHTML: (attrs) => ({ "data-custom-table": attrs.data }),
      },
    };
  },
  parseHTML() { return [{ tag:"div[data-custom-table]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes)]; },
  addNodeView() { return ReactNodeViewRenderer(TableView); },
  addCommands() { return { insertCustomTable:()=>({ commands })=>commands.insertContent({ type:this.name }) }; },
});

// ─── Gráfico ──────────────────────────────────────────────────────────────────
/*
 * Mesmo padrão de variável de módulo descrito em `_openTableModal` acima.
 * O componente `Notas` registra a função neste slot ao montar e a limpa ao
 * desmontar para evitar referências a setState de componentes não montados.
 */
let _openChartModal = null;

// ChartView: apenas visualização inline — sem inputs dentro do editor
function ChartView({ node, updateAttributes }) {
  const parsed = useMemo(() => {
    try { return JSON.parse(node.attrs.data || "{}"); } catch { return {}; }
  }, [node.attrs.data]);

  const labels = parsed.labels || [];
  const values = parsed.values || [];
  const max    = Math.max(...values, 1);
  const color  = parsed.color || "#7c5cff";

  const handleEdit = () => {
    _openChartModal?.(parsed, (newData) => {
      updateAttributes({ data: JSON.stringify(newData) });
    });
  };

  return (
    <NodeViewWrapper>
      <div contentEditable={false} style={{ margin:"12px 0", padding:18, background:"var(--bg-input)", borderRadius:14, border:"1px solid var(--border)" }}>
        {/* Cabeçalho */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: labels.length ? 14 : 0 }}>
          <span style={{ fontSize:16 }}>📊</span>
          {parsed.title && <span style={{ fontWeight:700, fontSize:15, color:"var(--text)", flex:1 }}>{parsed.title}</span>}
          <button
            onClick={handleEdit}
            style={{ marginLeft:"auto", padding:"5px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--bg-card)", cursor:"pointer", fontSize:12.5, color:"var(--text-label)", fontWeight:600 }}
          >✏ Editar dados</button>
        </div>

        {/* Barras */}
        {labels.length === 0 ? (
          <div style={{ textAlign:"center", color:"var(--text-label)", fontSize:13, padding:"20px 0", opacity:0.55 }}>
            Clique em <b>Editar dados</b> para adicionar valores ao gráfico
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {labels.map((label, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:12.5, width:110, textAlign:"right", color:"var(--text-label)", flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {label}
                </span>
                <div style={{ flex:1, background:"var(--border)", borderRadius:6, height:30, overflow:"hidden" }}>
                  <div style={{
                    height:"100%",
                    width:`${((values[i] ?? 0) / max) * 100}%`,
                    background:`linear-gradient(90deg, ${color}, ${color}cc)`,
                    borderRadius:6,
                    display:"flex", alignItems:"center", paddingLeft:10,
                    minWidth:36,
                    transition:"width 600ms ease",
                  }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#fff", whiteSpace:"nowrap" }}>
                      {values[i]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// Modal de edição do gráfico — renderizado FORA do editor pelo componente Notas
function ChartEditModal({ data, onSave, onClose }) {
  const [form, setForm] = useState({
    title:  data.title  || "",
    labels: (data.labels || []).join(", "),
    values: (data.values || []).join(", "),
    color:  data.color  || "#7c5cff",
  });

  const handleSave = () => {
    const ls = form.labels.split(",").map(s => s.trim()).filter(Boolean);
    const vs = form.values.split(",").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    onSave({ title: form.title, labels: ls, values: vs, color: form.color });
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.35)", backdropFilter:"blur(3px)" }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"var(--bg-card)", borderRadius:18, padding:28, width:"min(480px,94vw)", boxShadow:"0 24px 60px rgba(40,20,80,0.22)", border:"1px solid var(--border)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <span style={{ fontWeight:800, fontSize:17, color:"var(--text)" }}>📊 Editar gráfico</span>
          <button onClick={onClose} style={{ background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:8, cursor:"pointer", fontSize:16, color:"var(--text-label)", width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--text-label)", textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>Título</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Vendas por mês"
              style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:"1px solid var(--border)", background:"var(--bg-input)", color:"var(--text)", fontSize:14, outline:"none", boxSizing:"border-box" }} />
          </div>

          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--text-label)", textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>Rótulos <span style={{ opacity:0.55, fontWeight:400, textTransform:"none" }}>(separados por vírgula)</span></label>
            <input value={form.labels} onChange={e => setForm(p => ({ ...p, labels: e.target.value }))}
              placeholder="Ex: Jan, Fev, Mar, Abr"
              style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:"1px solid var(--border)", background:"var(--bg-input)", color:"var(--text)", fontSize:14, outline:"none", boxSizing:"border-box" }} />
          </div>

          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--text-label)", textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:5 }}>Valores <span style={{ opacity:0.55, fontWeight:400, textTransform:"none" }}>(separados por vírgula)</span></label>
            <input value={form.values} onChange={e => setForm(p => ({ ...p, values: e.target.value }))}
              placeholder="Ex: 120, 200, 85, 310"
              style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:"1px solid var(--border)", background:"var(--bg-input)", color:"var(--text)", fontSize:14, outline:"none", boxSizing:"border-box" }} />
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"var(--text-label)", textTransform:"uppercase", letterSpacing:"0.5px" }}>Cor das barras</label>
            <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
              style={{ width:40, height:30, cursor:"pointer", border:"1px solid var(--border)", padding:2, borderRadius:7, background:"none" }} />
            <span style={{ fontSize:12, color:"var(--text-label)" }}>{form.color}</span>
          </div>

          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button onClick={handleSave}
              style={{ flex:1, padding:"10px", borderRadius:10, background:"linear-gradient(135deg,#7a4dff,#9d4edd)", color:"#fff", border:"none", cursor:"pointer", fontWeight:700, fontSize:14, boxShadow:"0 3px 10px rgba(124,77,255,0.3)" }}>
              ✓ Salvar gráfico
            </button>
            <button onClick={onClose}
              style={{ padding:"10px 16px", borderRadius:10, background:"var(--bg-input)", border:"1px solid var(--border)", cursor:"pointer", fontSize:14, color:"var(--text-label)" }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ChartExtension = Node.create({
  name:"chart", group:"block", atom:true,
  addAttributes() {
    return {
      data: {
        default: JSON.stringify({ title:"", labels:[], values:[], color:"#7c5cff" }),
        parseHTML: (el) => el.getAttribute("data-chart"),
        renderHTML: (attrs) => ({ "data-chart": attrs.data }),
      },
    };
  },
  parseHTML() { return [{ tag:"div[data-chart]" }]; },
  renderHTML({ HTMLAttributes }) { return ["div", mergeAttributes(HTMLAttributes)]; },
  addNodeView() { return ReactNodeViewRenderer(ChartView); },
  addCommands() { return { insertChart:()=>({ commands })=>commands.insertContent({ type:this.name }) }; },
});

// ─── Painel de blocos ─────────────────────────────────────────────────────────
const BLOCKS = [
  { section:"Texto", items:[
    { icon:"¶",  label:"Parágrafo", desc:"Texto simples",       action:e=>e.chain().focus().setParagraph().run() },
    { icon:"H1", label:"Título 1",  desc:"Título grande",       action:e=>e.chain().focus().toggleHeading({level:1}).run() },
    { icon:"H2", label:"Título 2",  desc:"Título médio",        action:e=>e.chain().focus().toggleHeading({level:2}).run() },
    { icon:"H3", label:"Título 3",  desc:"Título pequeno",      action:e=>e.chain().focus().toggleHeading({level:3}).run() },
  ]},
  { section:"Listas", items:[
    { icon:"• —", label:"Lista",    desc:"Itens com marcador",  action:e=>e.chain().focus().toggleBulletList().run() },
    { icon:"1.",  label:"Numerada", desc:"Lista numerada",      action:e=>e.chain().focus().toggleOrderedList().run() },
    { icon:"☑",   label:"Tarefas",  desc:"Checkboxes",          action:e=>e.chain().focus().toggleTaskList().run() },
  ]},
  { section:"Destaques", items:[
    { icon:"💡", label:"Info",    desc:"Bloco informativo", action:e=>e.chain().focus().insertCallout("info").run(),    color:"#3b82f6" },
    { icon:"⚠️", label:"Aviso",   desc:"Bloco de atenção",  action:e=>e.chain().focus().insertCallout("warning").run(), color:"#f59e0b" },
    { icon:"✅", label:"Sucesso", desc:"Confirmação",       action:e=>e.chain().focus().insertCallout("success").run(), color:"#10b981" },
    { icon:"❌", label:"Erro",    desc:"Alerta de erro",    action:e=>e.chain().focus().insertCallout("error").run(),   color:"#ef4444" },
    { icon:'"',  label:"Citação", desc:"Bloco de citação",  action:e=>e.chain().focus().toggleBlockquote().run() },
    { icon:"</>",label:"Código",  desc:"Bloco de código",   action:e=>e.chain().focus().toggleCodeBlock().run() },
  ]},
  { section:"Inserir", items:[
    { icon:"🖼",  label:"Imagem",    desc:"Upload do computador",  action:null, special:"image" },
    { icon:"🔗",  label:"Link",      desc:"Hiperlink",             action:null, special:"link" },
    { icon:"—",   label:"Separador", desc:"Linha divisória",       action:e=>e.chain().focus().setHorizontalRule().run() },
  ]},
  { section:"Widgets interativos", items:[
    { icon:"⊞",  label:"Tabela",    desc:"Tabela editável inline",  action:e=>e.chain().focus().insertCustomTable().run() },
    { icon:"📊",  label:"Gráfico",   desc:"Gráfico de barras",      action:e=>e.chain().focus().insertChart().run() },
  ]},
];

function BlockPicker({ editor, onClose, onImage, onLink }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.35)", backdropFilter:"blur(3px)" }} onMouseDown={onClose}>
      <div onMouseDown={e=>e.stopPropagation()} style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:20, boxShadow:"0 24px 64px rgba(60,40,120,0.24)", padding:28, width:"min(600px,95vw)", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:"var(--text)" }}>➕ Inserir bloco</div>
            <div style={{ fontSize:12.5, color:"var(--text-label)", marginTop:2 }}>Escolha o tipo de conteúdo para adicionar</div>
          </div>
          <button onMouseDown={onClose} style={{ background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:8, cursor:"pointer", fontSize:16, color:"var(--text-label)", width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        {BLOCKS.map(({ section, items }) => (
          <div key={section} style={{ marginBottom:22 }}>
            <div style={{ fontSize:10, fontWeight:800, color:"var(--text-label)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10, paddingBottom:7, borderBottom:"1px solid var(--border)" }}>{section}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:8 }}>
              {items.map(({ icon, label, desc, action, special, color }) => (
                <button key={label}
                  onMouseDown={e => { e.preventDefault(); if (special==="image") onImage(); else if (special==="link") onLink(); else if (action) action(editor); onClose(); }}
                  style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7, padding:"14px 8px", borderRadius:12, border:"1.5px solid var(--border)", background:"var(--bg-input)", cursor:"pointer", textAlign:"center", transition:"all 140ms" }}
                  onMouseEnter={e=>{ e.currentTarget.style.background="rgba(124,92,255,0.08)"; e.currentTarget.style.borderColor="rgba(124,92,255,0.45)"; e.currentTarget.style.transform="translateY(-2px)"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background="var(--bg-input)"; e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.transform="none"; }}
                >
                  <span style={{ fontSize:26, lineHeight:1, color:color||"#7c5cff" }}>{icon}</span>
                  <span style={{ fontWeight:700, fontSize:12.5, color:"var(--text)" }}>{label}</span>
                  <span style={{ fontSize:11, color:"var(--text-label)", lineHeight:1.35 }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function TB({ onClick, active, title, children }) {
  return (
    <button onMouseDown={e=>{ e.preventDefault(); onClick(); }} title={title}
      style={{ background:active?"rgba(124,92,255,0.15)":"transparent", border:active?"1px solid rgba(124,92,255,0.35)":"1px solid transparent", borderRadius:7, color:active?"#7c5cff":"var(--text-label)", cursor:"pointer", fontWeight:600, fontSize:12, padding:"5px 8px", lineHeight:1, display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap", transition:"background 120ms" }}
      onMouseEnter={e=>{ if (!active){ e.currentTarget.style.background="var(--bg-input)"; e.currentTarget.style.color="var(--text)"; } }}
      onMouseLeave={e=>{ if (!active){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="var(--text-label)"; } }}
    >{children}</button>
  );
}
const Sep = () => <div style={{ width:1, height:20, background:"var(--border)", margin:"0 3px", flexShrink:0 }} />;
const SLabel = ({ children }) => <span style={{ fontSize:10, fontWeight:700, color:"var(--text-label)", textTransform:"uppercase", letterSpacing:"0.5px", padding:"0 2px", opacity:0.55 }}>{children}</span>;

// ─── Sidebar item ─────────────────────────────────────────────────────────────
function NotaItem({ nota, ativa, onClick }) {
  const cor = getCor(nota.cor);
  const preview = (nota.conteudo||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,75)||"Sem conteúdo";
  const bg = ativa?"rgba(124,92,255,0.1)":"transparent";
  const bl = ativa?"3px solid #7c5cff":nota.cor!=="default"?`3px solid ${cor.dot}`:"3px solid transparent";
  return (
    <div onClick={onClick} style={{ padding:"10px 12px", borderRadius:10, cursor:"pointer", background:bg, border:ativa?"1px solid rgba(124,92,255,0.25)":"1px solid transparent", borderLeft:bl, transition:"background 150ms" }}
      onMouseEnter={e=>{ if (!ativa) e.currentTarget.style.background="var(--bg-input)"; }}
      onMouseLeave={e=>{ if (!ativa) e.currentTarget.style.background=bg; }}>
      <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
        {nota.favorita && <span style={{ fontSize:11 }}>⭐</span>}
        {nota.cor!=="default" && <span style={{ width:8, height:8, borderRadius:"50%", background:cor.dot, flexShrink:0, display:"inline-block" }} />}
        <span style={{ fontWeight:600, fontSize:13, color:"var(--text)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nota.titulo||"Sem título"}</span>
      </div>
      <div style={{ fontSize:11, color:"var(--text-label)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{preview}</div>
      <div style={{ fontSize:10, color:"var(--text-label)", marginTop:4, opacity:0.65 }}>
        {new Date(nota.updated_at).toLocaleDateString("pt-BR",{ day:"2-digit", month:"short", year:"numeric" })}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Notas() {
  const [notas,      setNotas]      = useState([]);
  const [notaAtiva,  setNotaAtiva]  = useState(null);
  const [titulo,     setTitulo]     = useState("");
  const [busca,      setBusca]      = useState("");
  const [salvando,   setSalvando]   = useState(false);
  const [salvoEm,    setSalvoEm]    = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [showBlocks,    setShowBlocks]    = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [chartModal,    setChartModal]    = useState(null);
  const [tableModal,    setTableModal]    = useState(null);

  const imgInputRef  = useRef(null);
  const saveTimer    = useRef(null);
  const tituloTimer  = useRef(null);
  const notaAtivaRef = useRef(null);

  useEffect(() => { notaAtivaRef.current = notaAtiva; }, [notaAtiva]);

  /*
   * Registra os callbacks nas variáveis de módulo para que as node views
   * (TableView, ChartView) possam abrir modais no componente pai.
   * O cleanup no retorno do useEffect garante que, se Notas for desmontado,
   * cliques tardios em node views não chamem setState em componente morto.
   */
  useEffect(() => {
    _openChartModal = (data, onSave) => setChartModal({ data, onSave });
    _openTableModal = (data, onSave) => setTableModal({ data, onSave });
    return () => { _openChartModal = null; _openTableModal = null; };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit, Underline,
      CustomTaskList, CustomTaskItem,
      CustomLink, CustomImage,
      CustomHighlight, CustomColor,
      CalloutExtension,
      TableExtension,
      ChartExtension,
    ],
    content: "",
    onUpdate({ editor }) {
      if (!notaAtivaRef.current) return;
      agendarSave({ conteudo: editor.getHTML() });
    },
  });

  useEffect(() => {
    const id = "nota-editor-css";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = EDITOR_CSS; // sempre atualiza para pegar mudanças de CSS
  }, []);

  const carregar = useCallback(async () => {
    try { const { data } = await api.get("/notas"); setNotas(data); } catch {}
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  function selecionarNota(nota) {
    const atual = notaAtivaRef.current;

    /*
     * Flush imediato antes de trocar de nota.
     *
     * O autosave usa debounce de 1500ms: se o usuário clicar em outra nota
     * dentro desse intervalo, o setTimeout seria cancelado pelo React ao
     * desmontar/remontar o estado e as alterações seriam perdidas silenciosamente.
     *
     * Ao detectar timers pendentes, cancelamos o debounce e disparamos o save
     * de forma síncrona (fire-and-forget) antes de trocar a nota ativa.
     *
     * A atualização otimista de `notas` é necessária para que, se o usuário
     * navegar de volta para a nota anterior imediatamente, o conteúdo exibido
     * já reflita o que ele tinha digitado — sem esperar a resposta da API.
     */
    if (atual && (saveTimer.current || tituloTimer.current)) {
      clearTimeout(saveTimer.current);
      clearTimeout(tituloTimer.current);
      saveTimer.current   = null;
      tituloTimer.current = null;

      const html    = editor?.getHTML() || "";
      const tituloAtual = titulo;

      setNotas(prev =>
        prev.map(n =>
          n.id === atual.id
            ? { ...n, conteudo: html, titulo: tituloAtual }
            : n
        )
      );

      // Persiste no servidor (fire-and-forget)
      api.put(`/notas/${atual.id}`, { conteudo: html, titulo: tituloAtual }).catch(() => {});
    } else {
      clearTimeout(saveTimer.current);
      clearTimeout(tituloTimer.current);
    }

    setNotaAtiva(nota);
    setTitulo(nota.titulo || "");
    setSalvoEm(null);
    editor?.commands.setContent(nota.conteudo || "", false);
  }

  /*
   * Autosave com debounce.
   *
   * O delay de 1500ms é deliberadamente maior que o padrão de 500-800ms
   * encontrado em outras ferramentas de notas. Aqui o conteúdo pode ser
   * HTML com widgets embedded (tabelas, gráficos) — serializar e transmitir
   * payloads maiores a cada keystroke saturaria a API em sessões longas.
   * 1500ms oferece boa percepção de autosave sem pressão excessiva no backend.
   */
  function agendarSave(campos, delay=1500) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(()=>salvar(campos), delay);
  }

  async function salvar(campos) {
    const atual = notaAtivaRef.current; if (!atual) return;
    setSalvando(true);
    try {
      const { data } = await api.put(`/notas/${atual.id}`, campos);
      setNotas(prev=>prev.map(n=>n.id===data.id?data:n).sort((a,b)=>{ if (a.favorita!==b.favorita) return b.favorita-a.favorita; return new Date(b.updated_at)-new Date(a.updated_at); }));
      setNotaAtiva(data); setSalvoEm(new Date());
    } catch {}
    setSalvando(false);
  }

  function handleTituloChange(e) {
    const val = e.target.value; setTitulo(val);
    if (tituloTimer.current) clearTimeout(tituloTimer.current);
    tituloTimer.current = setTimeout(()=>salvar({ titulo:val }), 1000);
  }

  async function novaNota() {
    try {
      const { data } = await api.post("/notas",{ titulo:"", conteudo:"", cor:"default", favorita:false });
      setNotas(prev=>[data,...prev]); selecionarNota(data);
    } catch {}
  }

  async function excluirNota() {
    if (!notaAtiva || !window.confirm("Excluir esta nota permanentemente?")) return;
    try {
      await api.delete(`/notas/${notaAtiva.id}`);
      setNotas(notas.filter(n=>n.id!==notaAtiva.id));
      setNotaAtiva(null); setTitulo(""); editor?.commands.clearContent();
    } catch {}
  }

  async function toggleFavorita() { if (notaAtiva) await salvar({ favorita:!notaAtiva.favorita }); }
  async function mudarCor(cor)     { await salvar({ cor }); }

  function handleImgUpload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => editor?.chain().focus().setImage({ src:ev.target.result, alt:file.name }).run();
    reader.readAsDataURL(file); e.target.value = "";
  }

  function addLink() {
    const prev = editor?.getAttributes("link").href||"";
    const url = window.prompt("URL do link:", prev);
    if (url===null) return;
    if (!url) { editor?.chain().focus().unsetLink().run(); return; }
    editor?.chain().focus().setLink({ href:url }).run();
  }

  const filtradas = notas.filter(n=>{ if (!busca) return true; const q=busca.toLowerCase(); return (n.titulo||"").toLowerCase().includes(q)||(n.conteudo||"").replace(/<[^>]+>/g,"").toLowerCase().includes(q); });
  const favoritas = filtradas.filter(n=>n.favorita);
  const outras    = filtradas.filter(n=>!n.favorita);
  const corAtiva  = getCor(notaAtiva?.cor);
  const dropStyle = { position:"absolute", top:"calc(100% + 6px)", left:0, background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:12, boxShadow:"0 8px 24px rgba(60,40,120,0.14)", padding:10, zIndex:200, minWidth:140 };

  return (
    <div style={{ display:"flex", height:"calc(100vh - 62px - 40px)", background:"var(--bg-card)", borderRadius:16, overflow:"hidden", border:"1px solid var(--border)", boxShadow:"0 2px 16px rgba(76,29,149,0.08)" }}>

      {/* SIDEBAR */}
      <div style={{ width:270, minWidth:270, flexShrink:0, display:"flex", flexDirection:"column", background:"var(--bg-card)", borderRight:"1px solid var(--border)" }}>
        <div style={{ padding:"16px 14px 10px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <span style={{ fontWeight:800, fontSize:15, color:"var(--text)" }}>📝 Notas</span>
            <button onClick={novaNota} title="Nova nota" style={{ background:"linear-gradient(135deg,#7a4dff,#9d4edd)", color:"#fff", border:"none", borderRadius:8, padding:"5px 12px", fontSize:18, fontWeight:700, cursor:"pointer", lineHeight:1 }}>+</button>
          </div>
          <input type="text" placeholder="Pesquisar notas…" value={busca} onChange={e=>setBusca(e.target.value)}
            style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid var(--border)", background:"var(--bg-input)", color:"var(--text)", fontSize:12.5, boxSizing:"border-box", outline:"none" }} />
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:8 }}>
          {carregando && <div style={{ textAlign:"center", padding:30, color:"var(--text-label)", fontSize:13 }}>Carregando…</div>}
          {!carregando && notas.length===0 && (
            <div style={{ textAlign:"center", padding:"50px 16px", color:"var(--text-label)" }}>
              <div style={{ fontSize:36, marginBottom:10, opacity:0.4 }}>📄</div>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Nenhuma nota ainda</div>
              <button onClick={novaNota} style={{ background:"none", border:"none", color:"#7c5cff", cursor:"pointer", fontWeight:700, fontSize:13 }}>Criar primeira nota →</button>
            </div>
          )}
          {favoritas.length>0 && (<>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--text-label)", letterSpacing:"0.8px", padding:"8px 4px 4px", textTransform:"uppercase" }}>⭐ Favoritas</div>
            {favoritas.map(n=><NotaItem key={n.id} nota={n} ativa={notaAtiva?.id===n.id} onClick={()=>selecionarNota(n)} />)}
          </>)}
          {outras.length>0 && (<>
            {favoritas.length>0 && <div style={{ fontSize:10, fontWeight:700, color:"var(--text-label)", letterSpacing:"0.8px", padding:"10px 4px 4px", textTransform:"uppercase" }}>Todas</div>}
            {outras.map(n=><NotaItem key={n.id} nota={n} ativa={notaAtiva?.id===n.id} onClick={()=>selecionarNota(n)} />)}
          </>)}
          {!carregando && filtradas.length===0 && notas.length>0 && <div style={{ textAlign:"center", padding:"30px 12px", color:"var(--text-label)", fontSize:12 }}>Nenhuma nota encontrada.</div>}
        </div>
      </div>

      {/* EDITOR */}
      {!notaAtiva ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, color:"var(--text-label)", background:"var(--bg-input)" }}>
          <div style={{ fontSize:56, opacity:0.2 }}>📝</div>
          <div style={{ fontSize:16, fontWeight:700, opacity:0.4 }}>Selecione uma nota</div>
          <div style={{ fontSize:13, opacity:0.35, marginTop:-6 }}>ou crie uma nova</div>
          <button onClick={novaNota} style={{ marginTop:6, background:"linear-gradient(135deg,#7a4dff,#9d4edd)", color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:"0 4px 14px rgba(124,77,255,0.35)" }}>+ Nova nota</button>
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, background:corAtiva.bg, transition:"background 250ms" }}>

          {/* TOOLBAR */}
          <div style={{ padding:"6px 10px", borderBottom:"1px solid var(--border)", background:"var(--bg-card)", display:"flex", alignItems:"center", gap:3, flexWrap:"wrap" }}>
            {editor && (<>
              <button onMouseDown={e=>{ e.preventDefault(); setShowBlocks(true); }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:9, background:"linear-gradient(135deg,#7a4dff,#9d4edd)", color:"#fff", border:"none", cursor:"pointer", fontWeight:700, fontSize:13, boxShadow:"0 2px 8px rgba(124,77,255,0.35)", marginRight:4, whiteSpace:"nowrap" }}>
                ➕ Inserir bloco
              </button>
              <Sep />

              <SLabel>Texto</SLabel>
              <TB onClick={()=>editor.chain().focus().toggleBold().run()}      active={editor.isActive("bold")}      title="Negrito (Ctrl+B)"><Bold size={13} /> Negrito</TB>
              <TB onClick={()=>editor.chain().focus().toggleItalic().run()}    active={editor.isActive("italic")}    title="Itálico (Ctrl+I)"><Italic size={13} /> Itálico</TB>
              <TB onClick={()=>editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado"><UnderlineIcon size={13} /></TB>
              <TB onClick={()=>editor.chain().focus().toggleStrike().run()}    active={editor.isActive("strike")}    title="Tachado"><Strikethrough size={13} /></TB>

              {/* Cor */}
              <div style={{ position:"relative" }}>
                <button onMouseDown={e=>{ e.preventDefault(); setShowTextColor(v=>!v); setShowHighlight(false); }} title="Cor do texto"
                  style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 8px", borderRadius:7, border:"1px solid transparent", background:"transparent", cursor:"pointer", color:"var(--text-label)", fontWeight:700, fontSize:13 }}>
                  <span style={{ borderBottom:`3px solid ${editor.getAttributes("textColor").color||"#1a1a1a"}` }}>A</span><ChevronDown size={10} />
                </button>
                {showTextColor && (
                  <div onMouseDown={e=>e.stopPropagation()} style={{ ...dropStyle, display:"flex", flexDirection:"column", gap:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"var(--text-label)", textTransform:"uppercase", letterSpacing:"0.5px" }}>Cor do texto</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {TEXT_COLORS.map(hex=>(<button key={hex} onMouseDown={e=>{ e.preventDefault(); editor.chain().focus().setColor(hex).run(); setShowTextColor(false); }} title={hex} style={{ width:24, height:24, borderRadius:"50%", background:hex, border:"2px solid var(--border)", cursor:"pointer", padding:0 }} />))}
                    </div>
                    <button onMouseDown={e=>{ e.preventDefault(); editor.chain().focus().unsetColor().run(); setShowTextColor(false); }} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid var(--border)", background:"none", cursor:"pointer", fontSize:11.5, color:"var(--text-label)" }}>✕ Remover cor</button>
                  </div>
                )}
              </div>

              {/* Destaque */}
              <div style={{ position:"relative" }}>
                <button onMouseDown={e=>{ e.preventDefault(); setShowHighlight(v=>!v); setShowTextColor(false); }} title="Destaque"
                  style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 8px", borderRadius:7, border:editor.isActive("highlight")?"1px solid rgba(124,92,255,0.35)":"1px solid transparent", background:editor.isActive("highlight")?"rgba(124,92,255,0.1)":"transparent", cursor:"pointer", color:editor.isActive("highlight")?"#7c5cff":"var(--text-label)" }}>
                  <Highlighter size={13} /><span style={{ fontSize:12, fontWeight:600 }}>Destaque</span><ChevronDown size={10} />
                </button>
                {showHighlight && (
                  <div onMouseDown={e=>e.stopPropagation()} style={{ ...dropStyle, display:"flex", flexDirection:"column", gap:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"var(--text-label)", textTransform:"uppercase", letterSpacing:"0.5px" }}>Cor de fundo</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                      {HIGHLIGHT_COLS.map(hex=>(<button key={hex} onMouseDown={e=>{ e.preventDefault(); editor.chain().focus().setHighlight({ color:hex }).run(); setShowHighlight(false); }} title={hex} style={{ width:24, height:24, borderRadius:"50%", background:hex, border:"2px solid rgba(0,0,0,.1)", cursor:"pointer", padding:0 }} />))}
                    </div>
                    <button onMouseDown={e=>{ e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setShowHighlight(false); }} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid var(--border)", background:"none", cursor:"pointer", fontSize:11.5, color:"var(--text-label)" }}>✕ Remover</button>
                  </div>
                )}
              </div>
              <Sep />

              <SLabel>Título</SLabel>
              <TB onClick={()=>editor.chain().focus().toggleHeading({level:1}).run()} active={editor.isActive("heading",{level:1})} title="Título 1">H1</TB>
              <TB onClick={()=>editor.chain().focus().toggleHeading({level:2}).run()} active={editor.isActive("heading",{level:2})} title="Título 2">H2</TB>
              <TB onClick={()=>editor.chain().focus().toggleHeading({level:3}).run()} active={editor.isActive("heading",{level:3})} title="Título 3">H3</TB>
              <Sep />

              <SLabel>Listas</SLabel>
              <TB onClick={()=>editor.chain().focus().toggleBulletList().run()}  active={editor.isActive("bulletList")}  title="Lista"><List size={13} /> Lista</TB>
              <TB onClick={()=>editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numerada"><ListOrdered size={13} /> Núm.</TB>
              <TB onClick={()=>editor.chain().focus().toggleTaskList().run()}    active={editor.isActive("taskList")}    title="Tarefas"><ListTodo size={13} /> Tarefas</TB>
              <Sep />

              <SLabel>Blocos</SLabel>
              <TB onClick={()=>editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação"><Quote size={13} /></TB>
              <TB onClick={()=>editor.chain().focus().toggleCode().run()}       active={editor.isActive("code")}       title="Código inline"><Code size={13} /></TB>
              <TB onClick={()=>editor.chain().focus().toggleCodeBlock().run()}  active={editor.isActive("codeBlock")}  title="Bloco de código"><Code2 size={13} /></TB>
              <TB onClick={()=>editor.chain().focus().setHorizontalRule().run()} active={false}                        title="Separador"><Minus size={13} /></TB>
              <Sep />

              <TB onClick={()=>editor.chain().focus().undo().run()} active={false} title="Desfazer (Ctrl+Z)"><Undo2 size={13} /></TB>
              <TB onClick={()=>editor.chain().focus().redo().run()} active={false} title="Refazer"><Redo2 size={13} /></TB>
            </>)}

            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
              <div style={{ display:"flex", gap:4 }}>
                {CORES.map(c=>(<button key={c.value} onClick={()=>mudarCor(c.value)} title={c.label} style={{ width:16, height:16, borderRadius:"50%", padding:0, cursor:"pointer", background:c.dot, border:notaAtiva.cor===c.value?"2px solid #7c5cff":"1.5px solid transparent", outline:notaAtiva.cor===c.value?"1px solid rgba(124,92,255,0.4)":"none" }} />))}
              </div>
              <Sep />
              <button onClick={toggleFavorita} title={notaAtiva.favorita?"Remover dos favoritos":"Favoritar"}
                style={{ background:notaAtiva.favorita?"#fefce8":"transparent", border:notaAtiva.favorita?"1px solid #fde68a":"1px solid var(--border)", borderRadius:7, padding:"3px 7px", cursor:"pointer", fontSize:14, lineHeight:1 }}>
                {notaAtiva.favorita?"⭐":"☆"}
              </button>
              <button onClick={excluirNota} title="Excluir nota" style={{ background:"transparent", border:"1px solid var(--border)", borderRadius:7, padding:"3px 7px", cursor:"pointer", fontSize:13, color:"#dc2626", lineHeight:1 }}>🗑</button>
              <span style={{ fontSize:11, color:salvando?"#7c5cff":"var(--text-label)", minWidth:90, textAlign:"right", fontWeight:salvando?600:400 }}>
                {salvando?"Salvando…":salvoEm?`✓ ${salvoEm.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`:""}
              </span>
            </div>
          </div>

          {/* Título */}
          <input type="text" value={titulo} onChange={handleTituloChange} placeholder="Sem título"
            style={{ border:"none", outline:"none", padding:"28px 40px 10px", fontSize:32, fontWeight:800, letterSpacing:"-0.5px", color:"var(--text)", background:"transparent", width:"100%", boxSizing:"border-box" }} />

          {/* Editor */}
          <div className="nota-editor" style={{ flex:1, overflowY:"auto", padding:"6px 40px 60px", cursor:"text" }} onClick={()=>editor?.commands.focus()}>
            <EditorContent editor={editor} />
          </div>

          <input ref={imgInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleImgUpload} />
        </div>
      )}

      {showBlocks && <BlockPicker editor={editor} onClose={()=>setShowBlocks(false)} onImage={()=>imgInputRef.current?.click()} onLink={addLink} />}

      {chartModal && (
        <ChartEditModal
          data={chartModal.data}
          onSave={(newData) => { chartModal.onSave(newData); setChartModal(null); }}
          onClose={() => setChartModal(null)}
        />
      )}

      {tableModal && (
        <TableEditModal
          data={tableModal.data}
          onSave={(newTable) => { tableModal.onSave(newTable); setTableModal(null); }}
          onClose={() => setTableModal(null)}
        />
      )}
    </div>
  );
}
