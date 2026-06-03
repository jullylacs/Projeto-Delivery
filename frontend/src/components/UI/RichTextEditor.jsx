import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";

// Componente reutilizável de editor de texto rico baseado em TipTap.
// Props:
//   value      - HTML string controlado pelo pai
//   onChange   - callback(html) chamado a cada alteração
//   placeholder- texto exibido quando vazio (usa pseudo-elemento via CSS)
//   minHeight  - altura mínima da área de edição (default 120)
const editorStyles = `
  .rte-wrapper {
    border: 1px solid #d8cffb;
    border-radius: 8px;
    background: #fff;
    overflow: hidden;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .rte-wrapper:focus-within {
    border-color: #7c4dff;
    box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.16);
  }

  .rte-toolbar {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    border-bottom: 1px solid #ece4ff;
    background: #f8f5ff;
    flex-wrap: wrap;
  }

  .rte-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 4px 8px;
    cursor: pointer;
    color: #5f4e8f;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    min-width: 28px;
  }

  .rte-btn:hover {
    background: #efe8ff;
    color: #4b2d84;
  }

  .rte-btn.is-active {
    background: #efe8ff;
    color: #4b2d84;
    border-color: #d4c8fb;
  }

  .rte-content {
    padding: 10px 12px;
    color: #2f2758;
    font-size: 14px;
    line-height: 1.5;
    outline: none;
  }

  .rte-content .ProseMirror {
    outline: none;
    min-height: var(--rte-min-height, 120px);
  }

  .rte-content .ProseMirror p {
    margin: 0 0 6px 0;
  }

  .rte-content .ProseMirror ul,
  .rte-content .ProseMirror ol {
    padding-left: 22px;
    margin: 0 0 6px 0;
  }

  .rte-content .ProseMirror p.is-editor-empty:first-child::before {
    color: #9b94c2;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
`;

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Digite aqui...",
  minHeight = 120,
}) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value || "",
    onUpdate: ({ editor: ed }) => {
      if (typeof onChange === "function") {
        const html = ed.getHTML();
        // TipTap retorna "<p></p>" para conteúdo vazio. Normaliza para string vazia.
        onChange(html === "<p></p>" ? "" : html);
      }
    },
    editorProps: {
      attributes: {
        class: "rte-content",
        "data-placeholder": placeholder,
      },
    },
  });

  // Sincroniza o conteúdo quando o pai troca o valor externamente (ex.: abrir modal de edição).
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const normalized = value || "";
    if ((currentHtml === "<p></p>" ? "" : currentHtml) !== normalized) {
      editor.commands.setContent(normalized || "", false);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="rte-wrapper" style={{ "--rte-min-height": `${minHeight}px` }}>
        <style>{editorStyles}</style>
        <div className="rte-content" style={{ minHeight }} />
      </div>
    );
  }

  const isBold = editor.isActive("bold");
  const isItalic = editor.isActive("italic");
  const isUnderline = editor.isActive("underline");
  const isBulletList = editor.isActive("bulletList");
  const isOrderedList = editor.isActive("orderedList");

  const toggle = (action) => (event) => {
    event.preventDefault();
    action();
  };

  return (
    <div className="rte-wrapper" style={{ "--rte-min-height": `${minHeight}px` }}>
      <style>{editorStyles}</style>
      <div className="rte-toolbar" role="toolbar" aria-label="Formatação de texto">
        <button
          type="button"
          className={`rte-btn ${isBold ? "is-active" : ""}`}
          onMouseDown={toggle(() => editor.chain().focus().toggleBold().run())}
          title="Negrito (Ctrl+B)"
          aria-pressed={isBold}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={`rte-btn ${isItalic ? "is-active" : ""}`}
          onMouseDown={toggle(() => editor.chain().focus().toggleItalic().run())}
          title="Itálico (Ctrl+I)"
          aria-pressed={isItalic}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={`rte-btn ${isUnderline ? "is-active" : ""}`}
          onMouseDown={toggle(() => editor.chain().focus().toggleUnderline().run())}
          title="Sublinhado (Ctrl+U)"
          aria-pressed={isUnderline}
        >
          <span style={{ textDecoration: "underline" }}>U</span>
        </button>

        <span style={{ width: 1, background: "#e0d6fa", margin: "2px 4px" }} />

        <button
          type="button"
          className={`rte-btn ${isBulletList ? "is-active" : ""}`}
          onMouseDown={toggle(() => editor.chain().focus().toggleBulletList().run())}
          title="Lista com marcadores"
          aria-pressed={isBulletList}
        >
          • Lista
        </button>
        <button
          type="button"
          className={`rte-btn ${isOrderedList ? "is-active" : ""}`}
          onMouseDown={toggle(() => editor.chain().focus().toggleOrderedList().run())}
          title="Lista numerada"
          aria-pressed={isOrderedList}
        >
          1. Lista
        </button>
      </div>

      <EditorContent editor={editor} style={{ minHeight }} />
    </div>
  );
}
