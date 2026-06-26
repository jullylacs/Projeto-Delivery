import { useState, useRef, useEffect } from "react";
import api from "../services/api";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { Pin, Pencil, Trash2, X, Check, ImagePlus, Play } from "lucide-react";

// ── Utilitários ───────────────────────────────────────────────────────────────
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

function lerArquivo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const LIMITE_IMAGEM_MB = 3;
const LIMITE_VIDEO_MB = 8;
const MAX_IMAGENS = 5;
const MAX_VIDEOS = 1;

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@300;400;500;600;700&display=swap');

  .mural-root {
    --ink:       #1a1220;
    --ink-soft:  #4a3d60;
    --ink-faint: #8b7faa;
    --bg:        #f4f0ff;
    --surface:   #ffffff;
    --surface2:  #f0ebff;
    --accent:    #6c3bff;
    --accent2:   #e8405a;
    --border:    rgba(100,80,160,0.14);
    --shadow:    0 2px 16px rgba(60,30,120,0.07);
    --shadow-md: 0 8px 32px rgba(60,30,120,0.13);
    font-family: 'Inter', sans-serif;
    background: var(--bg);
    min-height: 100vh;
    padding: 0 0 80px;
  }

  /* Hero */
  .mural-hero {
    background: linear-gradient(135deg, #3a0f7a 0%, #6c3bff 55%, #9b6dff 100%);
    padding: 38px 24px 34px;
    position: relative;
    overflow: hidden;
  }
  .mural-hero::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 200px; height: 200px;
    background: rgba(255,255,255,0.05);
    border-radius: 50%;
  }
  .mural-hero::after {
    content: '';
    position: absolute;
    bottom: -60px; left: 10%;
    width: 280px; height: 280px;
    background: rgba(255,255,255,0.04);
    border-radius: 50%;
    pointer-events: none;
  }
  .mural-hero-inner {
    max-width: 780px;
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
    font-size: 36px;
    font-weight: 700;
    color: #fff;
    line-height: 1;
    letter-spacing: -0.5px;
    margin: 0;
  }
  .mural-subtitle {
    margin: 7px 0 0;
    font-size: 13px;
    color: rgba(255,255,255,0.62);
    font-weight: 400;
  }
  .mural-badge {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255,255,255,0.88);
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 999px;
    padding: 5px 14px;
    letter-spacing: 0.4px;
    white-space: nowrap;
    backdrop-filter: blur(4px);
  }

  /* Corpo */
  .mural-body {
    max-width: 780px;
    margin: 0 auto;
    padding: 32px 24px 0;
  }

  /* Compose */
  .compose-box {
    background: var(--surface);
    border-radius: 20px;
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
    padding: 16px 18px 0;
  }
  .compose-user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }
  .compose-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-faint);
  }
  .compose-toolbar {
    display: flex;
    gap: 2px;
    padding: 8px 16px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
    align-items: center;
  }
  .toolbar-btn {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 6px 8px;
    cursor: pointer;
    color: var(--ink-soft);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
    transition: background 0.15s, color 0.15s;
  }
  .toolbar-btn:hover { background: rgba(108,59,255,0.12); color: var(--accent); }
  .toolbar-btn.active { background: rgba(108,59,255,0.14); color: var(--accent); border-color: rgba(108,59,255,0.3); }
  .toolbar-sep {
    width: 1px;
    height: 18px;
    background: var(--border);
    margin: 0 4px;
  }

  /* TipTap no compose */
  .compose-tiptap .ProseMirror {
    outline: none;
    min-height: 100px;
    font-size: 14.5px;
    font-family: 'Inter', sans-serif;
    font-weight: 400;
    color: var(--ink);
    line-height: 1.65;
    padding: 14px 18px;
    cursor: text;
  }
  .compose-tiptap .ProseMirror > * + * { margin-top: 0.4em; }
  .compose-tiptap .ProseMirror p { margin: 0 0 4px; }
  .compose-tiptap .ProseMirror p.is-editor-empty:first-child::before {
    content: "Escreva um aviso, regra ou comunicado…";
    color: var(--ink-faint);
    opacity: 0.7;
    pointer-events: none;
    float: left;
    height: 0;
  }
  .compose-tiptap .ProseMirror h1 { font-size: 24px; font-weight: 800; margin: 12px 0 6px; color: var(--ink); }
  .compose-tiptap .ProseMirror h2 { font-size: 19px; font-weight: 700; margin: 10px 0 4px; color: var(--ink); }
  .compose-tiptap .ProseMirror h3 { font-size: 16px; font-weight: 700; margin: 8px 0 4px; color: var(--ink); }
  .compose-tiptap .ProseMirror ul,
  .compose-tiptap .ProseMirror ol { padding-left: 22px; margin: 6px 0; }
  .compose-tiptap .ProseMirror li { margin-bottom: 3px; }
  .compose-tiptap .ProseMirror pre { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; overflow-x: auto; margin: 6px 0; }
  .compose-tiptap .ProseMirror pre code { background: none; border: none; padding: 0; color: var(--ink); }
  .compose-tiptap .ProseMirror hr { border: none; border-top: 1px solid var(--border); margin: 10px 0; }
  .compose-tiptap .ProseMirror blockquote {
    border-left: 3px solid var(--accent);
    margin: 8px 0;
    padding: 4px 14px;
    color: var(--ink-soft);
    background: var(--surface2);
    border-radius: 0 8px 8px 0;
    font-style: italic;
  }
  .compose-tiptap .ProseMirror code {
    background: var(--surface2);
    border-radius: 4px;
    padding: 1px 5px;
    font-family: monospace;
    font-size: 12.5px;
    color: var(--accent);
  }

  /* TipTap no modal de edição */
  .edit-tiptap .ProseMirror {
    outline: none;
    min-height: 120px;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    color: var(--ink);
    line-height: 1.65;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1.5px solid var(--border);
    background: var(--surface2);
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .edit-tiptap .ProseMirror:focus { border-color: var(--accent); }
  .edit-tiptap .ProseMirror > * + * { margin-top: 0.4em; }
  .edit-tiptap .ProseMirror p { margin: 0 0 4px; }
  .edit-tiptap .ProseMirror h1 { font-size: 22px; font-weight: 800; margin: 10px 0 4px; color: var(--ink); }
  .edit-tiptap .ProseMirror h2 { font-size: 18px; font-weight: 700; margin: 8px 0 4px; color: var(--ink); }
  .edit-tiptap .ProseMirror h3 { font-size: 15px; font-weight: 700; margin: 6px 0 4px; color: var(--ink); }
  .edit-tiptap .ProseMirror ul,
  .edit-tiptap .ProseMirror ol { padding-left: 22px; margin: 6px 0; }
  .edit-tiptap .ProseMirror pre { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; overflow-x: auto; margin: 6px 0; }
  .edit-tiptap .ProseMirror pre code { background: none; border: none; padding: 0; color: var(--ink); }
  .edit-tiptap .ProseMirror hr { border: none; border-top: 1px solid var(--border); margin: 8px 0; }
  .edit-tiptap .ProseMirror blockquote {
    border-left: 3px solid var(--accent);
    margin: 8px 0;
    padding: 4px 14px;
    color: var(--ink-soft);
    font-style: italic;
  }
  .edit-tiptap .ProseMirror code { background: var(--surface2); border-radius: 4px; padding: 1px 5px; font-size: 12.5px; color: var(--accent); }

  /* HTML renderizado nos posts */
  .post-html-content { font-size: 14.5px; color: var(--ink-soft); line-height: 1.72; font-weight: 400; }
  .post-html-content p { margin: 0 0 8px; }
  .post-html-content p:last-child { margin-bottom: 0; }
  .post-html-content h1 { font-size: 26px; font-weight: 800; margin: 14px 0 6px; color: var(--ink); }
  .post-html-content h2 { font-size: 20px; font-weight: 700; margin: 12px 0 4px; color: var(--ink); }
  .post-html-content h3 { font-size: 16px; font-weight: 700; margin: 10px 0 4px; color: var(--ink); }
  .post-html-content ul, .post-html-content ol { margin: 8px 0; padding-left: 22px; }
  .post-html-content li { margin-bottom: 4px; }
  .post-html-content strong { font-weight: 600; color: var(--ink); }
  .post-html-content em { font-style: italic; }
  .post-html-content blockquote { margin: 10px 0; padding: 8px 14px; border-left: 3px solid var(--accent); color: var(--ink-soft); background: var(--surface2); border-radius: 0 8px 8px 0; font-style: italic; }
  .post-html-content code { background: var(--surface2); border: 1px solid var(--border); border-radius: 5px; padding: 1px 6px; font-size: 12.5px; color: var(--accent); font-family: 'Fira Mono', 'Courier New', monospace; }
  .post-html-content pre { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px; overflow-x: auto; margin: 10px 0; }
  .post-html-content pre code { background: none; border: none; padding: 0; color: var(--ink-soft); }
  .post-html-content hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }

  /* Área de mídia no compose */
  .compose-media-bar {
    padding: 10px 16px 14px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
    border-top: 1px solid var(--border);
  }
  .media-thumb {
    position: relative;
    width: 72px;
    height: 72px;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
    border: 1.5px solid var(--border);
    background: var(--surface2);
  }
  .media-thumb img,
  .media-thumb video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .media-thumb-badge {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.28);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 20px;
    pointer-events: none;
  }
  .media-thumb-remove {
    position: absolute;
    top: 3px;
    right: 3px;
    background: rgba(0,0,0,0.65);
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    padding: 0;
    z-index: 1;
    transition: background 0.15s;
  }
  .media-thumb-remove:hover { background: rgba(200,0,0,0.75); }
  .media-add-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 72px;
    height: 72px;
    border-radius: 10px;
    border: 1.5px dashed rgba(108,59,255,0.4);
    color: var(--accent);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    text-align: center;
  }
  .media-add-label:hover {
    background: rgba(108,59,255,0.07);
    border-color: rgba(108,59,255,0.6);
  }

  .compose-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    gap: 10px;
    background: var(--surface2);
  }
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
  .publish-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

  /* Posts */
  .posts-list { display: flex; flex-direction: column; gap: 18px; }

  .post-card {
    background: var(--surface);
    border-radius: 20px;
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
  .post-card-featured { border-color: rgba(108,59,255,0.28); }
  .post-card-top { height: 4px; }
  .post-card-body { padding: 18px 20px 16px; }

  .post-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .post-avatar {
    width: 40px;
    height: 40px;
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
    flex-wrap: wrap;
  }
  .post-author-role { font-size: 12px; color: var(--ink-faint); font-weight: 400; margin-top: 1px; }
  .post-date { font-size: 12px; color: var(--ink-faint); font-weight: 400; white-space: nowrap; }
  .post-featured-badge {
    font-size: 10px;
    font-weight: 700;
    background: linear-gradient(135deg, #6c3bff, #9b6dff);
    color: #fff;
    border-radius: 999px;
    padding: 2px 8px;
    letter-spacing: 0.3px;
  }

  /* Galeria */
  .post-gallery { margin-top: 14px; display: grid; gap: 3px; border-radius: 14px; overflow: hidden; }
  .post-gallery-1 { grid-template-columns: 1fr; }
  .post-gallery-2 { grid-template-columns: 1fr 1fr; }
  .post-gallery-3 { grid-template-columns: 1fr 1fr; }
  .post-gallery-3 .post-gallery-img:first-child { grid-column: span 2; }
  .post-gallery-4 { grid-template-columns: 1fr 1fr; }
  .post-gallery-img { width: 100%; aspect-ratio: 16/10; object-fit: cover; cursor: zoom-in; transition: opacity 0.15s, transform 0.2s; display: block; background: var(--surface2); }
  .post-gallery-1 .post-gallery-img { aspect-ratio: 16/9; max-height: 420px; }
  .post-gallery-img:hover { opacity: 0.92; transform: scale(1.01); }
  .post-gallery-more { position: relative; aspect-ratio: 16/10; background: var(--surface2); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; color: var(--ink-soft); }
  .post-gallery-more::after { content: ''; position: absolute; inset: 0; background: rgba(0,0,0,0.08); transition: background 0.15s; }
  .post-gallery-more:hover::after { background: rgba(0,0,0,0.14); }

  /* Vídeo */
  .post-video-wrap { margin-top: 14px; border-radius: 14px; overflow: hidden; background: #000; position: relative; }
  .post-video-wrap video { width: 100%; display: block; max-height: 380px; }
  .post-video-label { position: absolute; top: 8px; left: 10px; background: rgba(0,0,0,0.55); color: #fff; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; display: flex; align-items: center; gap: 4px; pointer-events: none; }

  /* Badge de mídia */
  .post-media-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--ink-faint); background: var(--surface2); border-radius: 999px; padding: 2px 8px; margin-top: 10px; }

  .post-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    padding: 10px 20px 14px;
    border-top: 1px solid var(--border);
    background: var(--surface2);
  }
  .action-btn { display: flex; align-items: center; gap: 5px; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500; border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer; transition: background 0.15s, transform 0.1s; }
  .action-btn:active { transform: scale(0.97); }
  .btn-edit   { background: rgba(108,59,255,0.1); color: var(--accent); }
  .btn-edit:hover  { background: rgba(108,59,255,0.18); }
  .btn-delete { background: rgba(232,64,90,0.08); color: var(--accent2); }
  .btn-delete:hover{ background: rgba(232,64,90,0.16); }

  /* Lightbox */
  .lightbox-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; z-index: 2000; animation: fadeIn 0.15s ease; padding: 20px; cursor: zoom-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .lightbox-img { max-width: 100%; max-height: 90vh; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,0.8); cursor: default; animation: popIn 0.2s ease; }
  @keyframes popIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
  .lightbox-close { position: fixed; top: 18px; right: 18px; background: rgba(255,255,255,0.15); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; font-size: 16px; transition: background 0.15s; }
  .lightbox-close:hover { background: rgba(255,255,255,0.25); }
  .lightbox-nav { position: fixed; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.12); border: none; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; font-size: 18px; transition: background 0.15s; }
  .lightbox-nav:hover { background: rgba(255,255,255,0.22); }
  .lightbox-nav-prev { left: 16px; }
  .lightbox-nav-next { right: 16px; }
  .lightbox-counter { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.65); font-size: 13px; font-weight: 500; }

  /* Modais */
  .modal-overlay { position: fixed; inset: 0; background: rgba(15,10,30,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1400; animation: fadeIn 0.2s ease; padding: 16px; }
  .modal-box { background: var(--surface); border-radius: 20px; overflow: hidden; min-width: 340px; max-width: 560px; width: 100%; box-shadow: 0 32px 64px rgba(40,20,90,0.28); animation: popIn 0.25s cubic-bezier(0.34,1.56,0.64,1); max-height: 90vh; overflow-y: auto; }
  .modal-header { background: linear-gradient(135deg, #5c2eff, #8b5cff); padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 1; }
  .modal-title { font-family: 'Playfair Display', serif; font-size: 17px; color: #fff; margin: 0; font-weight: 700; }
  .modal-close { background: rgba(255,255,255,0.18); border: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; transition: background 0.15s; }
  .modal-close:hover { background: rgba(255,255,255,0.28); }
  .modal-body { padding: 20px; }
  .edit-media-section { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
  .edit-media-label { font-size: 11px; font-weight: 700; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
  .edit-media-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .modal-btns { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
  .btn-cancel { background: transparent; color: var(--ink-soft); border: 1.5px solid var(--border); border-radius: 9px; padding: 9px 16px; font-family: 'Inter', sans-serif; font-size: 13px; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; gap: 5px; }
  .btn-cancel:hover { background: var(--surface2); }
  .btn-save { display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #6c3bff, #9b6dff); color: #fff; border: none; border-radius: 9px; padding: 9px 18px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; box-shadow: 0 3px 10px rgba(108,59,255,0.3); transition: opacity 0.15s, transform 0.1s; }
  .btn-save:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-save-danger { background: linear-gradient(135deg, #e8405a, #ff7a8a) !important; box-shadow: 0 3px 10px rgba(232,64,90,0.3) !important; }

  /* Empty / skeleton */
  .empty-state { text-align: center; padding: 72px 20px; color: var(--ink-faint); }
  .empty-icon { font-size: 48px; margin-bottom: 14px; }
  .empty-text { font-size: 15px; font-weight: 500; }
  .empty-sub  { font-size: 13px; margin-top: 4px; opacity: 0.7; }
  .skeleton { background: linear-gradient(90deg, var(--surface2) 25%, var(--surface) 50%, var(--surface2) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 8px; }
  @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

  /* Tema escuro */
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
  html[data-theme="dark"] .mural-hero { background: linear-gradient(135deg, #1a0640 0%, #4a1fa8 55%, #6c3bff 100%); }
  html[data-theme="dark"] .post-gallery-img { background: #17142b; }
  html[data-theme="dark"] .compose-tiptap .ProseMirror,
  html[data-theme="dark"] .edit-tiptap .ProseMirror { color: #ede8ff !important; }
`;

const ACCENT_TOPS = [
  "linear-gradient(90deg, #6c3bff, #e8405a)",
  "linear-gradient(90deg, #0e5a7a, #6c3bff)",
  "linear-gradient(90deg, #1f7a3f, #0e5a7a)",
  "linear-gradient(90deg, #ff9500, #e8405a)",
  "linear-gradient(90deg, #9b1b5a, #6c3bff)",
];

function MidiaThumbs({ midias, onRemover }) {
  return (
    <>
      {midias.map((m, i) => (
        <div key={i} className="media-thumb">
          {m.tipo === "imagem" ? (
            <img src={m.dados} alt={m.nome} />
          ) : (
            <>
              <video src={m.dados} />
              <div className="media-thumb-badge">▶</div>
            </>
          )}
          <button className="media-thumb-remove" onClick={() => onRemover(i)} title="Remover">✕</button>
        </div>
      ))}
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function MuralPage() {
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  /*
   * Apenas o perfil "admin" pode publicar, editar e excluir comunicados.
   * Deliberadamente não usamos `isGestorOuAdmin` porque o mural é um canal
   * oficial da empresa — gestores têm autonomia no Kanban e na Agenda, mas
   * publicações no mural devem ser aprovadas pela administração.
   * Se a política mudar, troque para: perfil === "admin" || perfil === "gestor"
   */
  const isAdmin = user?.perfil === "admin";

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Compose
  const [composeMidias, setComposeMidias] = useState([]);

  /*
   * Flag de "publicação em andamento" — necessária para desabilitar o botão
   * enquanto o POST está em trânsito, evitando cliques duplos que criariam
   * posts duplicados. O editor TipTap não tem loading state nativo, então
   * controlamos manualmente aqui.
   */
  const [publicando, setPublicando] = useState(false);
  const composeFileInputRef = useRef();

  // Edição
  const [editIndex, setEditIndex] = useState(null);
  const [editMidias, setEditMidias] = useState([]);
  const editFileInputRef = useRef();

  // Exclusão
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);

  // Lightbox
  const [lightbox, setLightbox] = useState(null);

  // Editores TipTap
  const composeEditor = useEditor({ extensions: [StarterKit, Underline], content: "" });
  const editEditor    = useEditor({ extensions: [StarterKit, Underline], content: "" });

  // Sincroniza conteúdo do editor de edição quando abre o modal
  useEffect(() => {
    if (editIndex !== null && editEditor) {
      editEditor.commands.setContent(posts[editIndex]?.conteudo || "", false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editIndex, editEditor]);

  useEffect(() => {
    api.get("/mural")
      .then(res => setPosts(res.data || []))
      .catch(() => setError("Erro ao carregar mural"))
      .finally(() => setLoading(false));
  }, []);

  // ── Publicar ───────────────────────────────────────────────────────────────
  async function handlePublicar() {
    const texto = composeEditor?.getHTML() || "";
    const isVazio = !texto || texto === "<p></p>";
    if (isVazio && composeMidias.length === 0) return;
    setPublicando(true);
    try {
      const res = await api.post("/mural", {
        autor: user?.nome || "Usuário",
        conteudo: isVazio ? "" : texto,
        midias: composeMidias,
      });
      setPosts(prev => [res.data, ...prev]);
      composeEditor?.commands.clearContent();
      setComposeMidias([]);
    } catch {
      setError("Erro ao publicar comunicado");
    } finally {
      setPublicando(false);
    }
  }

  function removerMidia(idx, setMidiasFn) {
    setMidiasFn(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleAdicionarMidias(e, setMidiasFn, midiaAtual) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const file of files) {
      const isVideo  = file.type.startsWith("video/");
      const isImagem = file.type.startsWith("image/");
      const limiteMB = isVideo ? LIMITE_VIDEO_MB : LIMITE_IMAGEM_MB;
      if (file.size > limiteMB * 1024 * 1024) { setError(`"${file.name}" excede ${limiteMB} MB.`); continue; }
      if (isImagem && midiaAtual.filter(m => m.tipo === "imagem").length >= MAX_IMAGENS) { setError(`Máximo de ${MAX_IMAGENS} imagens.`); continue; }
      if (isVideo  && midiaAtual.filter(m => m.tipo === "video").length  >= MAX_VIDEOS)  { setError(`Máximo de ${MAX_VIDEOS} vídeo.`);   continue; }
      try {
        const dados = await lerArquivo(file);
        setMidiasFn(prev => [...prev, { tipo: isVideo ? "video" : isImagem ? "imagem" : "arquivo", nome: file.name, dados, mimeType: file.type }]);
      } catch { setError("Erro ao ler arquivo."); }
    }
  }

  // ── Edição ─────────────────────────────────────────────────────────────────
  function abrirModalEdicao(idx) {
    setEditIndex(idx);
    setEditMidias(posts[idx].midias || []);
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    const texto = editEditor?.getHTML() || "";
    const isVazio = !texto || texto === "<p></p>";
    if (isVazio && editMidias.length === 0) return;
    try {
      const post = posts[editIndex];
      const res = await api.put(`/mural/${post.id}`, {
        conteudo: isVazio ? "" : texto,
        midias: editMidias,
      });
      setPosts(prev => { const n = [...prev]; n[editIndex] = res.data; return n; });
      setEditIndex(null);
    } catch {
      setError("Erro ao salvar edição");
    }
  }

  // ── Exclusão ───────────────────────────────────────────────────────────────
  async function excluirPostConfirmado(idx) {
    try {
      await api.delete(`/mural/${posts[idx].id}`);
      setPosts(prev => prev.filter((_, i) => i !== idx));
      setConfirmDeleteIndex(null);
    } catch {
      setError("Erro ao excluir comunicado");
      setConfirmDeleteIndex(null);
    }
  }

  // ── Lightbox ───────────────────────────────────────────────────────────────
  function abrirLightbox(imagens, idx) { setLightbox({ imagens, idx }); }
  function fecharLightbox() { setLightbox(null); }
  function lightboxAnterior() {
    setLightbox(prev => ({ ...prev, idx: (prev.idx - 1 + prev.imagens.length) % prev.imagens.length }));
  }
  function lightboxProximo() {
    setLightbox(prev => ({ ...prev, idx: (prev.idx + 1) % prev.imagens.length }));
  }

  // ── Galeria ────────────────────────────────────────────────────────────────
  function renderGaleria(imagens) {
    if (!imagens.length) return null;
    const visiveis = imagens.slice(0, 4);
    const extras = imagens.length - 4;
    return (
      <div className={`post-gallery post-gallery-${Math.min(visiveis.length, 4)}`}>
        {visiveis.map((m, i) => {
          const isUltima = i === 3 && extras > 0;
          return isUltima ? (
            <div key={i} className="post-gallery-more" onClick={() => abrirLightbox(imagens, i)}>
              <img src={m.dados} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              <span style={{ position: "relative", zIndex: 1, fontSize: 22, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>+{extras + 1}</span>
            </div>
          ) : (
            <img key={i} src={m.dados} alt={m.nome} className="post-gallery-img" onClick={() => abrirLightbox(imagens, i)} />
          );
        })}
      </div>
    );
  }

  // ── Toolbar helper ─────────────────────────────────────────────────────────
  function Toolbar({ editor }) {
    if (!editor) return null;
    return (
      <>
        <button className={`toolbar-btn${editor.isActive("bold")      ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}      title="Negrito"><b>B</b></button>
        <button className={`toolbar-btn${editor.isActive("italic")    ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}    title="Itálico"><i>I</i></button>
        <button className={`toolbar-btn${editor.isActive("underline") ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }} title="Sublinhado"><u>U</u></button>
        <button className={`toolbar-btn${editor.isActive("strike")    ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}    title="Tachado"><s>S</s></button>
        <div className="toolbar-sep" />
        <button className={`toolbar-btn${editor.isActive("heading", { level: 1 }) ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }} title="Título 1">H1</button>
        <button className={`toolbar-btn${editor.isActive("heading", { level: 2 }) ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }} title="Título 2">H2</button>
        <button className={`toolbar-btn${editor.isActive("heading", { level: 3 }) ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }} title="Título 3">H3</button>
        <div className="toolbar-sep" />
        <button className={`toolbar-btn${editor.isActive("bulletList")  ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}  title="Lista">• —</button>
        <button className={`toolbar-btn${editor.isActive("orderedList") ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }} title="Lista numerada">1.</button>
        <button className={`toolbar-btn${editor.isActive("blockquote") ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }} title="Citação">"</button>
        <button className={`toolbar-btn${editor.isActive("code")       ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}       title="Código">`</button>
        <button className={`toolbar-btn${editor.isActive("codeBlock")  ? " active" : ""}`} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }}  title="Bloco de código">{"</>"}</button>
        <button className="toolbar-btn"                                                     onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHorizontalRule().run(); }} title="Separador">—</button>
        <div className="toolbar-sep" />
        <button className="toolbar-btn" onMouseDown={e => { e.preventDefault(); editor.chain().focus().undo().run(); }} title="Desfazer">↩</button>
        <button className="toolbar-btn" onMouseDown={e => { e.preventDefault(); editor.chain().focus().redo().run(); }} title="Refazer">↪</button>
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mural-root">
      <style>{css}</style>

      {/* Hero */}
      <div className="mural-hero">
        <div className="mural-hero-inner">
          <div>
            <h1 className="mural-title">Mural Interno</h1>
            <p className="mural-subtitle">
              {posts.length} comunicado{posts.length !== 1 ? "s" : ""} publicado{posts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <span className="mural-badge">
            <Pin size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            NVX Fibra
          </span>
        </div>
      </div>

      {/* Corpo */}
      <div className="mural-body">

        {error && (
          <div style={{ margin: "0 0 16px", padding: "10px 14px", borderRadius: 10, background: "#fff1f2", border: "1px solid #ffc4cf", color: "#9b1f1f", fontSize: 13, fontWeight: 600 }}>
            ⚠ {error}
          </div>
        )}

        {/* Compose — somente admin */}
        {isAdmin && (
          <div className="compose-box">
            <div className="compose-header">
              <div className="compose-user-avatar" style={{ background: avatarGradient(user?.nome) }}>
                {initials(user?.nome)}
              </div>
              <span className="compose-label">Escrever comunicado</span>
            </div>

            <div className="compose-toolbar">
              <Toolbar editor={composeEditor} />
            </div>

            <div className="compose-tiptap" onClick={() => composeEditor?.commands.focus()}>
              <EditorContent editor={composeEditor} />
            </div>

            {composeMidias.length > 0 && (
              <div className="compose-media-bar">
                <MidiaThumbs midias={composeMidias} onRemover={i => removerMidia(i, setComposeMidias)} />
              </div>
            )}

            <div className="compose-footer">
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--ink-faint)", marginRight: "auto" }} title="Adicionar imagem/vídeo">
                <ImagePlus size={15} />
                Foto/Vídeo
                <input
                  ref={composeFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={e => handleAdicionarMidias(e, setComposeMidias, composeMidias)}
                />
              </label>
              <button className="publish-btn" onClick={handlePublicar} disabled={publicando}>
                {publicando ? "Publicando…" : <><Pin size={13} /> Publicar</>}
              </button>
            </div>
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div className="posts-list">
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: "var(--surface)", borderRadius: 20, padding: 20, border: "1.5px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: "50%" }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 14, width: "30%", borderRadius: 6, marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 11, width: "20%", borderRadius: 6 }} />
                  </div>
                </div>
                <div className="skeleton" style={{ height: 13, borderRadius: 6, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 13, width: "80%", borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="posts-list">
            {posts.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-text">Nenhum comunicado ainda.</div>
                {isAdmin && <div className="empty-sub">Use o formulário acima para publicar o primeiro.</div>}
              </div>
            )}

            {posts.map((post, i) => {
              const midias = post.midias || [];
              const imagens = midias.filter(m => m.tipo === "imagem");
              const videos  = midias.filter(m => m.tipo === "video");
              return (
                <div key={post.id || i} className={`post-card${i === 0 ? " post-card-featured" : ""}`}>
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

                    {/*
                      * Detecção de formato do conteúdo salvo.
                      *
                      * Posts criados antes da adoção do TipTap eram texto plano
                      * e podem existir no banco sem tags HTML. A heurística de
                      * verificar se o conteúdo começa com "<" distingue os dois
                      * formatos sem precisar de campo extra no banco:
                      *
                      * - HTML (TipTap):   renderizado via dangerouslySetInnerHTML —
                      *   seguro porque o backend sanitiza tudo ao salvar.
                      * - Texto plano:     renderizado com white-space:pre-wrap para
                      *   preservar quebras de linha originais.
                      *
                      * Se no futuro todos os posts forem migrados para HTML, este
                      * branch pode ser removido.
                      */}
                    {post.conteudo && (
                      <div className="post-html-content">
                        {post.conteudo.trimStart().startsWith("<")
                          ? <span dangerouslySetInnerHTML={{ __html: post.conteudo }} />
                          : <span style={{ whiteSpace: "pre-wrap" }}>{post.conteudo}</span>
                        }
                      </div>
                    )}

                    {renderGaleria(imagens)}

                    {videos.map((v, vi) => (
                      <div key={vi} className="post-video-wrap">
                        <video controls src={v.dados} preload="metadata" />
                        <div className="post-video-label">
                          <Play size={10} /> {v.nome}
                        </div>
                      </div>
                    ))}

                    {post.conteudo && midias.length > 0 && (
                      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {imagens.length > 0 && <span className="post-media-badge">🖼 {imagens.length} foto{imagens.length > 1 ? "s" : ""}</span>}
                        {videos.length > 0  && <span className="post-media-badge">🎬 {videos.length} vídeo{videos.length > 1 ? "s" : ""}</span>}
                      </div>
                    )}
                  </div>

                  {isAdmin && (
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
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox-overlay" onClick={fecharLightbox}>
          <button className="lightbox-close" onClick={fecharLightbox}><X size={16} /></button>
          <img src={lightbox.imagens[lightbox.idx].dados} alt="" className="lightbox-img" onClick={e => e.stopPropagation()} />
          {lightbox.imagens.length > 1 && (
            <>
              <button className="lightbox-nav lightbox-nav-prev" onClick={e => { e.stopPropagation(); lightboxAnterior(); }}>‹</button>
              <button className="lightbox-nav lightbox-nav-next" onClick={e => { e.stopPropagation(); lightboxProximo(); }}>›</button>
              <div className="lightbox-counter">{lightbox.idx + 1} / {lightbox.imagens.length}</div>
            </>
          )}
        </div>
      )}

      {/* Modal editar */}
      {editIndex !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditIndex(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3 className="modal-title">Editar comunicado</h3>
              <button className="modal-close" onClick={() => setEditIndex(null)} type="button"><X size={14} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={salvarEdicao}>
                <div style={{ display: "flex", gap: 3, marginBottom: 10, flexWrap: "wrap", padding: "6px 10px", background: "var(--surface2)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  <Toolbar editor={editEditor} />
                </div>
                <div className="edit-tiptap">
                  <EditorContent editor={editEditor} />
                </div>

                <div className="edit-media-section">
                  <div className="edit-media-label">Mídias anexadas</div>
                  <div className="edit-media-list">
                    {editMidias.length === 0 ? (
                      <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>Nenhuma mídia</span>
                    ) : (
                      <MidiaThumbs midias={editMidias} onRemover={i => removerMidia(i, setEditMidias)} />
                    )}
                    <label className="media-add-label" title="Adicionar mídia">
                      <ImagePlus size={18} />
                      <span>Adicionar</span>
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        style={{ display: "none" }}
                        onChange={e => handleAdicionarMidias(e, setEditMidias, editMidias)}
                      />
                    </label>
                  </div>
                </div>

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

      {/* Modal confirmar exclusão */}
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
