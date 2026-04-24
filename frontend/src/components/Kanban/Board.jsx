import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import {
  CalendarDays,
  ClipboardList,
  Download,
  DollarSign,
  FileText,
  FileUp,
  FileSpreadsheet,
  GripVertical,
  MapPin,
  MessageCircle,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import CardModal from "../Modal/CardModal";
import CommentInput from "./CommentInput";

const KANBAN_PREFS_KEY = "kanbanPrefs";
const KANBAN_FOCUS_CARD_KEY = "kanbanFocusCardId";
const KANBAN_FOCUS_EVENT = "kanban-focus-card";
const KANBAN_TRELLO_PREFS_KEY = "kanbanTrelloPrefs";
const normalizeColumnEntity = (item, index = 0) => ({
  id: Number(item?.id ?? item?._id ?? index + 1),
  nome: String(item?.nome || "").trim(),
  ordem: Number.isFinite(Number(item?.ordem)) ? Number(item.ordem) : index,
  limiteWip: item?.limiteWip ?? null,
});

const readKanbanPrefs = () => {
  try {
    const raw = localStorage.getItem(KANBAN_PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const readTrelloPrefs = () => {
  try {
    const raw = localStorage.getItem(KANBAN_TRELLO_PREFS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const normalizeImportStatus = (value, columns, fallback = "Novo") => {
  if (!value) return fallback;
  const found = columns.find((col) => col.toLowerCase() === String(value).toLowerCase());
  return found || fallback;
};

const mapImportedCard = ({ card, status, seller, sellerId }) => {
  const title = String(card?.titulo || card?.title || card?.name || "").trim();
  const description = String(card?.observacoes || card?.description || card?.desc || "").trim();
  const labels = Array.isArray(card?.labels) ? card.labels : [];
  const firstLabel = labels.find((label) => label?.name)?.name || "";
  const dueDateRaw = card?.prazo || card?.due || null;
  const dueDate = dueDateRaw && !Number.isNaN(new Date(dueDateRaw).getTime())
    ? new Date(dueDateRaw).toISOString().slice(0, 10)
    : "";

  return {
    titulo: title,
    cliente: title || "Card importado",
    telefone: String(card?.telefone || "Não informado"),
    endereco: String(card?.endereco || "Não informado"),
    coordenadas: {
      lat: String(card?.coordenadas?.lat || card?.lat || ""),
      lng: String(card?.coordenadas?.lng || card?.lng || ""),
    },
    tipoServico: String(card?.tipoServico || firstLabel || "Importado"),
    preco: Number(card?.preco || 0),
    sla: Number(card?.sla || 0),
    prazo: dueDate || null,
    observacoes: description || "Importado de fonte externa",
    status,
    coluna: status,
    vendedor: seller,
    vendedorId: sellerId,
    ip: String(card?.ip || ""),
    comments: Array.isArray(card?.comments) ? card.comments : [],
  };
};

const extractImportCards = (parsed, columns, fallbackStatus) => {
  if (Array.isArray(parsed)) {
    return parsed.map((item) => ({ card: item, status: fallbackStatus }));
  }

  if (Array.isArray(parsed?.cards)) {
    const listIdToName = new Map((parsed?.lists || []).map((list) => [list.id, list.name]));

    return parsed.cards
      .filter((card) => !card?.closed)
      .map((card) => {
        const listStatus = normalizeImportStatus(listIdToName.get(card.idList), columns, fallbackStatus);
        return { card, status: listStatus };
      });
  }

  if (Array.isArray(parsed?.items)) {
    return parsed.items.map((item) => ({ card: item, status: fallbackStatus }));
  }

  return [];
};

const parseTrelloBoardId = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Aceita ID puro, URL de board, ou URL curta do Trello
  const boardMatch = raw.match(/\/b\/([a-zA-Z0-9]+)/i);
  if (boardMatch?.[1]) return boardMatch[1];

  const shortMatch = raw.match(/trello\.com\/([a-zA-Z0-9]{8,})/i);
  if (shortMatch?.[1]) return shortMatch[1];

  return raw;
};

const EXPORT_FIELDS = [
  { key: "_id", label: "id" },
  { key: "titulo", label: "titulo" },
  { key: "cliente", label: "cliente" },
  { key: "telefone", label: "telefone" },
  { key: "endereco", label: "endereco" },
  { key: "tipoServico", label: "tipo_servico" },
  { key: "preco", label: "preco" },
  { key: "sla", label: "sla" },
  { key: "prazo", label: "prazo" },
  { key: "status", label: "status" },
  { key: "coluna", label: "coluna" },
  { key: "vendedor", label: "vendedor" },
  { key: "observacoes", label: "observacoes" },
  { key: "commentsCount", label: "comentarios" },
];

const normalizeExportValue = (card, fieldKey) => {
  if (fieldKey === "vendedor") {
    return card?.vendedor?.nome || card?.vendedor || card?.vendedorId || "";
  }

  if (fieldKey === "commentsCount") {
    return Array.isArray(card?.comments) ? card.comments.length : 0;
  }

  if (fieldKey === "prazo") {
    return card?.prazo ? new Date(card.prazo).toLocaleDateString("pt-BR") : "";
  }

  const value = card?.[fieldKey];
  return value ?? "";
};

const escapeCsvValue = (value) => {
  const asText = String(value ?? "");
  return `"${asText.replace(/"/g, '""')}"`;
};

const downloadBlobFile = (content, mimeType, fileName) => {
  const blob = new Blob([content], { type: mimeType });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
};

const getCardKey = (card) => card?._id || card?.id;
const getCardDomId = (cardId) => `kanban-card-${String(cardId ?? "").replace(/[^a-zA-Z0-9_-]/g, "")}`;
const getCardColumnId = (card) => {
  const candidate = card?.coluna_id ?? card?.colunaId ?? card?.column?.id;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePersonName = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const getReactionUserDisplayName = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Usuário";
  if (raw.includes("@")) {
    const localPart = raw.split("@")[0]?.trim();
    return localPart || "Usuário";
  }
  return raw;
};

const getReactionUserKey = (value) => normalizePersonName(getReactionUserDisplayName(value));

const roleLabelByKey = {
  comercial: "Comercial",
  operacional: "Operacional",
  tecnico: "Técnico",
  gestor: "Gestor",
  admin: "Administrador",
};

const formatRoleLabel = (role) => {
  const key = normalizePersonName(role);
  if (!key) return "Cargo não informado";
  return roleLabelByKey[key] || String(role);
};

const profileBadgePalette = {
  comercial: { bg: "#e9f1ff", text: "#1d4ed8", border: "#bfd3ff" },
  operacional: { bg: "#e8fbf1", text: "#047857", border: "#bae6d1" },
  tecnico: { bg: "#fff3e8", text: "#b45309", border: "#fed7aa" },
  gestor: { bg: "#f1ecff", text: "#6d28d9", border: "#ddd6fe" },
  admin: { bg: "#ffecec", text: "#b91c1c", border: "#fecaca" },
  default: { bg: "#efe8ff", text: "#5135b0", border: "#d6c8ff" },
};

const getProfileBadgeStyle = (perfil) => {
  const key = normalizePersonName(perfil);
  const palette = profileBadgePalette[key] || profileBadgePalette.default;
  return {
    background: palette.bg,
    color: palette.text,
    border: `1px solid ${palette.border}`,
  };
};

function MentionToken({ mentionText, profile }) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimerRef = useRef(null);
  const personName = profile?.name || mentionText.replace(/^@/, "") || "Usuário";
  const personAvatar = profile?.avatar || "";
  const personRole = formatRoleLabel(profile?.role);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
    }

    openTimerRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
    }
    setIsOpen(false);
  };

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        style={{
          color: "#5a34d1",
          fontWeight: 700,
          background: "#efe7ff",
          borderRadius: 7,
          padding: "1px 6px",
          border: "1px solid #dbcfff",
          cursor: "default",
        }}
      >
        {mentionText}
      </span>

      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: "calc(100% + 8px)",
          minWidth: 210,
          maxWidth: 280,
          background: "#ffffff",
          border: "1px solid #d9cdfd",
          borderRadius: 12,
          padding: "10px 12px",
          boxShadow: "0 12px 26px rgba(63, 47, 140, 0.2)",
          zIndex: 40,
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 180ms ease, transform 220ms ease",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {personAvatar ? (
              <img
                src={personAvatar}
                alt={personName}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1px solid #ddcffd",
                }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #8f6bff, #5b3fc9)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {personName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() || "")
                  .join("") || "U"}
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#3e2c9e",
                  fontWeight: 700,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {personName}
              </div>
              <div style={{ color: "#7768b3", fontSize: 12, marginTop: 2 }}>{personRole}</div>
            </div>
          </div>
      </div>
    </span>
  );
}

const renderCommentTextWithMentions = (text, mentionLookup) => {
  const source = String(text || "");
  const profiles = Array.from(mentionLookup.values()).sort((a, b) => b.name.length - a.name.length);
  if (!source || profiles.length === 0) return source;

  let cursor = 0;
  let output = "";

  while (cursor < source.length) {
    const atIndex = source.indexOf("@", cursor);
    if (atIndex === -1) {
      output += source.slice(cursor);
      break;
    }

    output += source.slice(cursor, atIndex);

    const prevChar = atIndex > 0 ? source[atIndex - 1] : "";
    const hasWordBefore = prevChar && /[\p{L}\p{N}_]/u.test(prevChar);
    if (hasWordBefore) {
      output += "@";
      cursor = atIndex + 1;
      continue;
    }

    let matchedProfile = null;
    let matchedText = "";

    for (const profile of profiles) {
      const mentionCandidate = `@${profile.name}`;
      const candidateSlice = source.slice(atIndex, atIndex + mentionCandidate.length);
      if (candidateSlice.toLowerCase() !== mentionCandidate.toLowerCase()) {
        continue;
      }

      const nextChar = source[atIndex + mentionCandidate.length] || "";
      if (nextChar && !/[\s.,!?;:()\[\]{}"']/u.test(nextChar)) {
        continue;
      }

      matchedProfile = profile;
      matchedText = source.slice(atIndex, atIndex + mentionCandidate.length);
      break;
    }

    if (!matchedProfile) {
      output += "@";
      cursor = atIndex + 1;
      continue;
    }

    const mentionHref = `/__mention__/${encodeURIComponent(normalizePersonName(matchedProfile.name))}`;
    output += `[${matchedText}](${mentionHref})`;
    cursor = atIndex + matchedText.length;
  }

  return output;
};

const renderCommentMarkdownWithMentions = (text, mentionLookup) => {
  const markdown = renderCommentTextWithMentions(text, mentionLookup);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p style={{ margin: "0 0 6px", lineHeight: 1.55 }}>{children}</p>,
        ul: ({ children }) => <ul style={{ margin: "6px 0", paddingLeft: 20 }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: "6px 0", paddingLeft: 20 }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
        strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
        em: ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
        blockquote: ({ children }) => (
          <blockquote
            style={{
              margin: "8px 0",
              padding: "4px 10px",
              borderLeft: "3px solid #c4b2ff",
              color: "#5a4a9d",
              background: "#f5efff",
              borderRadius: 6,
            }}
          >
            {children}
          </blockquote>
        ),
        code: ({ children }) => (
          <code
            style={{
              background: "#ece5ff",
              border: "1px solid #dacdff",
              borderRadius: 6,
              padding: "1px 5px",
              fontSize: 12,
              color: "#4a379b",
            }}
          >
            {children}
          </code>
        ),
        a: ({ href, children }) => {
          if (href && href.startsWith("/__mention__/")) {
            const normalizedName = decodeURIComponent(href.replace("/__mention__/", ""));
            const profile = mentionLookup.get(normalizedName);
            const mentionText = Array.isArray(children) ? children.join("") : String(children || "@");

            return <MentionToken mentionText={mentionText} profile={profile} />;
          }

          return <span>{children}</span>;
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
};

// Estilos da aplicação - definições de CSS-in-JS para componentes
const styles = {
    detailsModalCard: {
      background: 'linear-gradient(165deg, #f8f6ff 0%, #f1ecff 42%, #ede7ff 100%)',
      borderRadius: '24px',
      boxShadow: '0 24px 52px rgba(57, 31, 136, 0.24), 0 3px 14px rgba(0,0,0,0.08)',
      padding: '22px 24px',
      width: 'min(1280px, calc(100vw - 24px))',
      maxHeight: '90vh',
      margin: '0 auto',
      position: 'relative',
      border: '1px solid #d2c6ff',
      minHeight: '620px',
      fontFamily: 'inherit',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    },
    detailsContent: {
      display: 'grid',
      gridTemplateColumns: '0.55fr 1.45fr',
      gap: '14px',
      minHeight: 0,
      flex: 1,
      overflow: 'hidden',
    },
    detailsMain: {
      display: 'flex',
      flexDirection: 'column',
      background: '#f7f4ff',
      border: '1px solid #d9ccff',
      borderRadius: '18px',
      padding: '18px',
      minHeight: 0,
    },
    detailsMainBody: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      paddingRight: '6px',
    },
    detailsHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '18px',
      padding: '10px 12px',
      borderRadius: '14px',
      background: 'linear-gradient(135deg, rgba(132, 99, 255, 0.16), rgba(85, 57, 196, 0.14))',
      border: '1px solid rgba(111, 87, 226, 0.26)',
    },
    detailsTitle: {
      margin: 0,
      color: '#4c3393',
      fontSize: '26px',
      fontWeight: 700,
      letterSpacing: '-0.5px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    detailsSection: {
      marginBottom: '18px',
      paddingBottom: '12px',
      borderBottom: '1px solid #ece7fa',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    detailsRow: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '4px',
      fontSize: '16px',
      color: '#3e2c9e',
      fontWeight: 500,
      padding: '8px 10px',
      background: '#f8f5ff',
      border: '1px solid #e6deff',
      borderRadius: '10px',
    },
    detailsLabel: {
      minWidth: 'unset',
      color: '#7c6fb7',
      fontWeight: 600,
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
    },
    detailsValue: {
      color: '#2d225a',
      fontWeight: 600,
      fontSize: '17px',
      lineHeight: 1.35,
    },
    detailsStatusRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      margin: '10px 0 0 0',
    },
    detailsActions: {
      margin: '14px 0 0 0',
      paddingTop: '12px',
      borderTop: '1px solid #e0d6ff',
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
      background: '#f7f4ff',
      borderRadius: '12px',
    },
    detailsObservacoes: {
      background: '#ede7ff',
      gridTemplateColumns: 'minmax(360px, 420px) minmax(0, 1fr)',
      padding: '16px 18px',
      color: '#4b3b9a',
      fontSize: '14px',
      marginTop: '8px',
      marginBottom: '8px',
      border: '1px solid #d8cdfd',
    },
    detailsComments: {
      marginTop: 0,
      background: '#f0ecff',
      borderRadius: '16px',
      padding: '16px',
      minWidth: 0,
      boxShadow: 'inset 0 0 0 1px #ddd3ff',
      minHeight: '540px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    },
    detailsCommentsHeader: {
      display: 'flex',
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px',
      paddingBottom: '10px',
      borderBottom: '1px solid #ddd1ff',
    },
    detailsCommentsList: {
      flex: 1,
      flexWrap: 'wrap',
      minHeight: 0,
      overflowY: 'auto',
      paddingRight: '6px',
    },
    detailsComposer: {
      marginTop: '12px',
      paddingTop: '10px',
      borderTop: '1px solid #ddd1ff',
      background: '#f0ecff',
    },
    detailsCommentItem: {
      padding: '14px',
      background: '#ffffff',
      borderRadius: '12px',
      marginBottom: '12px',
      border: '1px solid #e1d8ff',
    },
    detailsCommentAuthor: {
      margin: 0,
      color: '#4f3dab',
      fontWeight: 600,
    },
    detailsCommentText: {
      margin: '6px 0 0',
      color: '#4f3dab',
    },
    detailsCommentDate: {
      color: '#7c6fb7',
      fontSize: '11px',
      marginTop: '8px',
      display: 'block',
      textAlign: 'right',
    },
    detailsCloseBtn: {
      border: 'none',
      background: 'transparent',
      fontSize: '28px',
      cursor: 'pointer',
      color: '#7f6ad7',
      transition: 'color 0.2s',
      marginLeft: '12px',
    },
  container: {
    padding: "20px",
    minHeight: "80vh",
    background: "linear-gradient(180deg, #f8f7ff 0%, #f2f0ff 100%)",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  header: {
    marginBottom: "28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },
  title: {
    color: "#3c2f9f",
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    background: "linear-gradient(90deg, #8b64ff, #5a30ff)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  addButton: {
    background: "linear-gradient(135deg, #7f5af0 0%, #5a36d6 100%)",
    color: "#fff",
    border: "none",
    padding: "11px 20px",
    borderRadius: "10px",
    cursor: "pointer",
    boxShadow: "0 6px 14px rgba(82, 45, 199, 0.35)",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  tableContainer: {
    width: "100%",
    maxWidth: "100vw",
    overflowX: "auto",
    overflowY: "hidden",
    borderRadius: "16px",
    background: "#faf9ff",
    border: "1px solid #d6d0ff",
    padding: "12px 0",
    boxSizing: "border-box",
    position: "relative",
    scrollBehavior: "smooth",
    minHeight: 0,
  },
  table: {
    width: "max-content",
    minWidth: "100%",
    borderCollapse: "separate",
    borderSpacing: "10px 0",
    tableLayout: "auto",
  },
  th: {
    background: "#fff",
    color: "#3c2f9f",
    padding: "10px 12px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.2px",
    borderRadius: "12px 12px 0 0",
    border: "1px solid #d6d0ff",
    borderBottom: "none",
    minWidth: "360px",
  },
  td: {
    padding: "0",
    verticalAlign: "top",
    background: "#fff",
    border: "1px solid #d6d0ff",
    borderTop: "none",
    borderRadius: "0 0 12px 12px",
    minWidth: "360px",
    width: "360px",
  },
  cardItem: {
    background: "#fff",
    borderRadius: "12px",
    padding: "16px 14px",
    marginBottom: "10px",
    boxShadow: "0 8px 18px rgba(62,44,158,0.08)",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "grab",
    borderWidth: "1px",
    borderStyle: "solid",
    borderTopColor: "#d6d0ff",
    borderRightColor: "#d6d0ff",
    borderBottomColor: "#d6d0ff",
    borderLeftColor: "#7c5cff",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxSizing: "border-box",
    overflow: "hidden",
    wordBreak: "break-word",
    whiteSpace: "pre-line",
    minWidth: "330px",
    maxWidth: "100%",
    width: "100%",
  },
  cardTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#3c2f9f",
    marginBottom: "4px",
    lineHeight: "1.3",
    wordBreak: "break-word",
    overflowWrap: "break-word",
    whiteSpace: "pre-line",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  infoText: {
    color: "#5f5a88",
    flex: 1,
    wordBreak: "break-word",
    overflowWrap: "break-word",
    whiteSpace: "pre-line",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardItemHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 10px 18px rgba(75, 35, 182, 0.22)",
    borderTopColor: "#bca8ff",
    borderRightColor: "#bca8ff",
    borderBottomColor: "#bca8ff",
    borderLeftColor: "#7c5cff",
  },
  cardItemPromoted: {
    animation: "promoteToTop 520ms cubic-bezier(0.22, 0.61, 0.36, 1)",
    zIndex: 3,
  },
  cardItemTargeted: {
    animation: "focusMentionCard 900ms ease",
    boxShadow: "0 0 0 2px #7f5af0, 0 12px 24px rgba(95, 61, 198, 0.24)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  cardTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#3c2f9f",
    marginBottom: "4px",
    lineHeight: "1.3",
  },
  cardBadge: {
    background: "#faf9ff",
    color: "#3c2f9f",
    padding: "4px 10px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "500",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  cardInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "12px",
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
    color: "#5a5a6e",
  },
  infoIcon: {
    fontSize: "14px",
    minWidth: "20px",
  },
  infoText: {
    color: "#4a4a5e",
    flex: 1,
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "12px",
    borderTop: "1px solid #e8deff",
    marginTop: "4px",
  },
  vendorInfo: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    color: "#8b8aa2",
  },
  footerMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  updatedInfo: {
    fontSize: "10px",
    color: "#8f86b8",
    lineHeight: 1.2,
  },
  detailButton: {
    background: "#ede6ff",
    border: "none",
    color: "#5b3ad1",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: "7px",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    position: "relative",
    zIndex: 2,
  },
  priceTag: {
    fontWeight: "700",
    color: "#2e7d32",
    background: "#e8f5e9",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  deadlineTag: {
    fontSize: "11px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    borderRadius: "12px",
    background: "#fff3e0",
    color: "#e65100",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4000,
  },
  modal: {
    background: "#fff",
    borderRadius: "24px",
    padding: "28px",
    width: "100%",
    maxWidth: "540px",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    border: "1px solid rgba(108,59,255,0.1)",
  },
  createModal: {
    background: "linear-gradient(180deg, #fcfbff 0%, #f6f1ff 100%)",
    borderRadius: "26px",
    padding: "20px",
    width: "min(920px, calc(100vw - 28px))",
    maxHeight: "88vh",
    overflowY: "auto",
    boxShadow: "0 28px 60px rgba(43, 20, 111, 0.24)",
    border: "1px solid #ddd4ff",
  },
  modalTitle: {
    marginBottom: "20px",
    color: "#4c3393",
    fontSize: "24px",
    fontWeight: "600",
  },
  createHero: {
    display: "grid",
    gridTemplateColumns: "1fr 220px",
    gap: "14px",
    padding: "16px",
    background: "linear-gradient(135deg, #ffffff 0%, #f2ebff 100%)",
    border: "1px solid #e3d8ff",
    borderRadius: "20px",
    marginBottom: "18px",
    boxShadow: "0 10px 24px rgba(92, 57, 201, 0.08)",
  },
  createHeroTitleWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  createHeroTitle: {
    margin: 0,
    color: "#41288f",
    fontSize: "24px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  createHeroText: {
    margin: 0,
    color: "#6b5baa",
    fontSize: "13px",
    lineHeight: 1.55,
    maxWidth: "470px",
  },
  createHeroBadgeRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  createHeroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#efe8ff",
    border: "1px solid #ddd1ff",
    color: "#5a43af",
    fontSize: "12px",
    fontWeight: "600",
  },
  createHeroSide: {
    display: "grid",
    gap: "10px",
    alignContent: "start",
  },
  createMetaCard: {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid #e6dcff",
    borderRadius: "16px",
    padding: "12px 14px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  },
  createMetaLabel: {
    margin: 0,
    color: "#8978c1",
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "0.7px",
    textTransform: "uppercase",
  },
  createMetaValue: {
    margin: "5px 0 0",
    color: "#3f2b85",
    fontSize: "14px",
    fontWeight: "700",
  },
  createBody: {
    display: "grid",
    gap: "12px",
  },
  createSection: {
    background: "#f9f6ff",
    border: "1px solid #e1d8ff",
    borderRadius: "18px",
    padding: "14px",
    boxShadow: "0 8px 18px rgba(84, 56, 190, 0.06)",
  },
  createSectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    marginBottom: "12px",
  },
  createSectionTitle: {
    margin: 0,
    color: "#463191",
    fontSize: "14px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  createSectionChip: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#6d59b4",
    background: "#eee7ff",
    border: "1px solid #d8ccff",
    borderRadius: "999px",
    padding: "4px 9px",
  },
  createSectionGrid: {
    display: "grid",
    gap: "12px",
  },
  createRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  createField: {
    display: "grid",
    gap: "6px",
  },
  createLabel: {
    color: "#6853b0",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  createRequired: {
    color: "#e53935",
    fontSize: "11px",
    fontWeight: "800",
  },
  createInput: {
    width: "100%",
    border: "1px solid #d9d0f9",
    borderRadius: "12px",
    padding: "12px 14px",
    background: "#ffffff",
    color: "#201b5f",
    fontSize: "13px",
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  createTextArea: {
    width: "100%",
    border: "1px solid #d9d0f9",
    borderRadius: "12px",
    padding: "12px 14px",
    background: "#ffffff",
    color: "#201b5f",
    fontSize: "13px",
    minHeight: "110px",
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: "vertical",
  },
  createFooterNote: {
    margin: "2px 0 0",
    color: "#7d6bb8",
    fontSize: "12px",
  },
  formGrid: {
    display: "grid",
    gap: "12px",
  },
  modalInput: {
    width: "100%",
    border: "1px solid #e2e0f0",
    borderRadius: "12px",
    padding: "12px 14px",
    background: "#fefefe",
    color: "#1e1a61",
    fontSize: "14px",
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
  },
  modalTextArea: {
    width: "100%",
    border: "1px solid #e2e0f0",
    borderRadius: "12px",
    padding: "12px 14px",
    background: "#fefefe",
    color: "#1e1a61",
    fontSize: "14px",
    minHeight: "80px",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    resize: "vertical",
  },
  actionGroup: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "20px",
  },
  cancelBtn: {
    border: "1px solid #e2e0f0",
    background: "#ffffff",
    color: "#5b4eaa",
    padding: "10px 20px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },
  saveBtn: {
    border: "none",
    background: "linear-gradient(135deg, #7c5bff, #5a30ff)",
    color: "#fff",
    padding: "10px 24px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  errorText: {
    color: "#d32f2f",
    fontSize: "13px",
    fontWeight: "500",
    margin: "12px 0 0",
    padding: "8px",
    background: "#ffebee",
    borderRadius: "8px",
  },
  filterContainer: {
    display: "grid",
    gridTemplateColumns: "1fr 200px 200px auto",
    gap: "12px",
    marginBottom: "24px",
    padding: "12px",
    backgroundColor: "#efe8ff",
    borderRadius: "14px",
    border: "1px solid #dbd0ff",
    boxShadow: "none",
  },
  densityGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "#efe8ff",
    border: "1px solid #d8cbff",
    borderRadius: "10px",
    padding: "4px",
  },
  densityButton: {
    border: "none",
    borderRadius: "8px",
    background: "transparent",
    color: "#5f48b4",
    fontSize: "12px",
    fontWeight: 600,
    padding: "6px 10px",
    cursor: "pointer",
  },
  densityButtonActive: {
    background: "#ffffff",
    color: "#4b2fb6",
    boxShadow: "0 2px 6px rgba(76, 47, 182, 0.2)",
  },
};

// Componente de coluna que recebe cards arrastáveis
// Define uma área onde cards podem ser soltos (droppable)
function DroppableColumn({ id, children, minHeight, padding }) {
  // useDroppable do dnd-kit para criar área de destino de drag and drop
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: minHeight || "540px",
        background: isOver ? "#ece2ff" : "#f7f3ff",
        borderRadius: "0 0 12px 12px",
        border: "1px dashed #d4c4ff",
        transition: "background 0.2s ease",
        padding: padding || "10px",
      }}
    >
      {children}
    </div>
  );
}

// Componente de card que pode ser arrastado
// Representa um item individual no kanban
function DraggableCard({ card, onOpen, densityCfg, isPromoted = false, isTargeted = false, domId }) {
    // Função para copiar o link do card
    const handleCopyLink = (e) => {
      e.stopPropagation();
      const cardId = card?._id || card?.id;
      if (!cardId) return;
      const url = `${window.location.origin}${window.location.pathname}#card-${cardId}`;
      // Tenta copiar usando Clipboard API, se falhar usa fallback
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => showCopyMsg(), showFallback);
      } else {
        showFallback();
      }

      function showFallback() {
        // Fallback: cria input temporário
        const tempInput = document.createElement('input');
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
          document.execCommand('copy');
        } catch {}
        tempInput.remove();
        showCopyMsg();
      }

      function showCopyMsg() {
        const msg = document.createElement('div');
        msg.textContent = 'Copiado com sucesso';
        msg.style.position = 'fixed';
        msg.style.top = '24px';
        msg.style.right = '24px';
        msg.style.background = '#5a30ff';
        msg.style.color = '#fff';
        msg.style.padding = '10px 22px';
        msg.style.borderRadius = '10px';
        msg.style.fontWeight = '700';
        msg.style.fontSize = '15px';
        msg.style.boxShadow = '0 2px 12px rgba(90,48,255,0.13)';
        msg.style.zIndex = 9999;
        document.body.appendChild(msg);
        setTimeout(() => { msg.remove(); }, 1400);
      }
    };
  // useDraggable do dnd-kit para tornar o card arrastável
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: getCardKey(card) });
  const [isHovered, setIsHovered] = useState(false);
  const safeTransformX = Number.isFinite(transform?.x) ? transform.x : 0;
  const safeTransformY = Number.isFinite(transform?.y) ? transform.y : 0;
  const draggableTransform = transform ? `translate3d(${safeTransformX}px, ${safeTransformY}px, 0)` : undefined;
  
  // Estilo dinâmico baseado no estado de arrasto e hover
  const style = {
    transform: draggableTransform,
    opacity: isDragging ? 0.5 : 1, // Reduz opacidade durante arrasto
    transition: isDragging ? "none" : styles.cardItem.transition,
    willChange: "transform",
    ...styles.cardItem,
    padding: densityCfg?.cardPadding || styles.cardItem.padding,
    minWidth: densityCfg?.cardMinWidth || styles.cardItem.minWidth,
    ...(isPromoted ? styles.cardItemPromoted : {}),
    ...(isTargeted ? styles.cardItemTargeted : {}),
    ...(isHovered ? styles.cardItemHover : {}), // Adiciona efeito hover
  };

  // Formata o preço para moeda brasileira (R$)
  const formatPrice = (price) => {
    if (!price) return null;
    return Number(price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Verifica se o prazo está atrasado comparando com a data atual
  const isOverdue = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const formatTimeSinceUpdate = (dateValue) => {
    if (!dateValue) return "Atualizado agora";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Atualizado agora";

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMinutes < 1) return "Atualizado agora";
    if (diffMinutes < 60) return `Atualizado há ${diffMinutes} min`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Atualizado há ${diffHours} h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Atualizado há ${diffDays} d`;

    return `Atualizado em ${date.toLocaleDateString("pt-BR")}`;
  };

  // Manipulador para abrir o modal de detalhes do card
  const handleDetailClick = (e) => {
    e.stopPropagation(); // Evita propagação do evento para elementos pai
    console.log('[Detalhes] Clique no botão de detalhes do card', card);
    onOpen(card);
  };

  return (
    <div
      id={domId}
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setIsHovered(true)}  // Ativa hover
      onMouseLeave={() => setIsHovered(false)} // Desativa hover
      {...attributes} // Propriedades de acessibilidade para drag and drop
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: card.tipo_card ? 8 : 0 }}>
        {/* Badge do tipo_card no topo */}
        {card.tipo_card && (
          <div style={{
            background: '#e7e3ff',
            color: '#5a30ff',
            fontWeight: 700,
            fontSize: 13,
            borderRadius: 10,
            padding: '4px 16px',
            display: 'inline-block',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            border: '1px solid #cfc2ff',
            alignSelf: 'flex-start',
          }}>
            {card.tipo_card}
          </div>
        )}
        {/* Botão de copiar link do card (ícone) */}
        {(card._id || card.id) && (
          <button
            onClick={handleCopyLink}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              marginLeft: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Copiar link do card"
          >
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="10" height="10" rx="3" stroke="#5a30ff" strokeWidth="2" fill="#f3f0ff"/>
              <rect x="3" y="3" width="10" height="10" rx="3" stroke="#b7aaff" strokeWidth="2" fill="#fff"/>
            </svg>
          </button>
        )}
      </div>
      <div style={styles.cardHeader}>
        {/* Alça para arrastar o card */}
        <div
          style={{ cursor: "grab", marginRight: 8, userSelect: "none", display: "inline-block" }}
          {...listeners} // Event listeners para drag and drop
        >
          <GripVertical size={18} style={{ marginRight: 6, color: "#7b68cc" }} />
        </div>
        <div style={{ flex: 1 }}>
          {/* Título do card - usa título ou cliente como fallback */}
          <div style={styles.cardTitle}>
            {card.titulo || card.cliente || "Sem título"}
          </div>
          {/* Exibe cliente se houver título separado */}
          {card.cliente && card.titulo && (
            <div style={{ fontSize: densityCfg?.metaFontSize || "11px", color: "#8b8aa2", marginTop: "2px" }}>
              {card.cliente}
            </div>
          )}
        </div>
        {/* Badge com status do card */}
        <div style={styles.cardBadge}>
          <Zap size={12} /> {card.status || "Novo"}
        </div>
      </div>

      <div style={styles.cardInfo}>
        {/* Tipo de serviço - exibe ícone de ferramenta */}
        {card.tipoServico && (
          <div style={{ ...styles.infoRow, fontSize: densityCfg?.metaFontSize || styles.infoRow.fontSize }}>
            <span style={styles.infoIcon}><Wrench size={14} /></span>
            <span style={styles.infoText}>{card.tipoServico}</span>
          </div>
        )}
        
        {/* Endereço - exibe ícone de localização */}
        {card.endereco && (
          <div style={{ ...styles.infoRow, fontSize: densityCfg?.metaFontSize || styles.infoRow.fontSize }}>
            <span style={styles.infoIcon}><MapPin size={14} /></span>
            <span style={styles.infoText}>{card.endereco}</span>
          </div>
        )}

        {/* Tags de preço, prazo e SLA */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
          {/* Tag de preço */}
          {card.preco && (
            <span style={styles.priceTag}>
              <DollarSign size={12} /> {formatPrice(card.preco)}
            </span>
          )}
          {/* Tag de prazo com destaque visual para atrasado */}
          {card.prazo && (
            <span style={{
              ...styles.deadlineTag,
              background: isOverdue(card.prazo) ? "#ffebee" : "#fff3e0", // Vermelho se atrasado
              color: isOverdue(card.prazo) ? "#c62828" : "#e65100",
            }}>
              <CalendarDays size={12} /> {new Date(card.prazo).toLocaleDateString("pt-BR")}
            </span>
          )}
          {/* Tag de SLA (Service Level Agreement) */}
          {card.sla > 0 && (
            <span style={{ ...styles.deadlineTag, background: "#e3f2fd", color: "#1565c0" }}>
              ⏱️ SLA: {card.sla} horas
            </span>
          )}
        </div>
      </div>

      {/* Rodapé do card com vendedor e botão de detalhes */}
      <div style={styles.cardFooter}>
        <div style={styles.footerMeta}>
          <div style={styles.vendorInfo}>
            <User size={12} />
            <span>{card.vendedor?.nome || card.vendedor || card.vendedorId || "Sem vendedor"}</span>
          </div>
          <span style={styles.updatedInfo}>{formatTimeSinceUpdate(card.updatedAt || card.createdAt)}</span>
        </div>
        <button
          onClick={handleDetailClick}
          style={styles.detailButton}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f0ff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          Ver detalhes
        </button>
      </div>
    </div>
  );
}

// Componente principal do Kanban Board
export default function Board() {
  const trelloPrefs = readTrelloPrefs();
  // Estados principais
  const [cards, setCards] = useState([]);           // Lista de todos os cards
  const [selectedCard, setSelectedCard] = useState(null); // Card selecionado para detalhes
  const [statusEdit, setStatusEdit] = useState("");    // Coluna temporária para edição (id em string)
  const [commentText, setCommentText] = useState("");      // Texto do comentário sendo escrito
  const [isCommentComposerOpen, setIsCommentComposerOpen] = useState(false);
  const [replyDraftByCommentId, setReplyDraftByCommentId] = useState({});
  const [activeReplyCommentId, setActiveReplyCommentId] = useState(null);
  const [editingReplyKey, setEditingReplyKey] = useState(null);
  const [editingReplyText, setEditingReplyText] = useState("");
  const [hoveredReactionKey, setHoveredReactionKey] = useState(null);
  const [vendorEdit, setVendorEdit] = useState("");
  const [vendorSearchCreate, setVendorSearchCreate] = useState("");
  const [vendorSearchDetails, setVendorSearchDetails] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);   // Controle do modal de criação
  const [isEditCardOpen, setIsEditCardOpen] = useState(false); // Controle do modal de edição
  const [editingCard, setEditingCard] = useState(null);    // Card sendo editado
  const [searchTerm, setSearchTerm] = useState(() => readKanbanPrefs().searchTerm || "");        // Termo de busca
  const [statusFilter, setStatusFilter] = useState(() => readKanbanPrefs().statusFilter || "");    // Filtro por status
  const [vendorFilter, setVendorFilter] = useState(() => readKanbanPrefs().vendorFilter || "");    // Filtro por vendedor
  const [newCard, setNewCard] = useState({                 // Dados do novo card
    titulo: "",
    cliente: "",
    telefone: "",
    endereco: "",
    coordenadas: { lat: "", lng: "" },
    tipoServico: "",
    mensalidade: "",
    instalacao: "",
    tipo_card: "",
    sla: 0,
    prazo: "",
    tempoContratual: "",
    observacoes: "",
    vendedorId: "",
    colunaId: undefined,
  });
  const [error, setError] = useState("");                  // Mensagem de erro
  const [activeId, setActiveId] = useState(null);          // ID do card sendo arrastado
  const [isCreating, setIsCreating] = useState(false);     // Flag para criação em andamento
  const [density, setDensity] = useState(() => readKanbanPrefs().density || "confortavel");  // Densidade visual (Bitrix-style)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRaw, setImportRaw] = useState("");
  const [importDefaultStatus, setImportDefaultStatus] = useState("Novo");
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingTrello, setIsImportingTrello] = useState(false);
  const [isBulkDeletingCards, setIsBulkDeletingCards] = useState(false);
  const [importSummary, setImportSummary] = useState("");
  const [externalExportSummary, setExternalExportSummary] = useState("");
  const [trelloBoardRef, setTrelloBoardRef] = useState(() => trelloPrefs.boardRef || "");
  const [trelloKey, setTrelloKey] = useState(() => trelloPrefs.key || "");
  const [trelloToken, setTrelloToken] = useState(() => trelloPrefs.token || "");
  const [isDataActionsOpen, setIsDataActionsOpen] = useState(false);
  const [promotedCardId, setPromotedCardId] = useState(null);
  const [targetedCardId, setTargetedCardId] = useState(null);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState(null);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [, setTimeTick] = useState(0);
  const [columnDefs, setColumnDefs] = useState([]);
  const [isColumnsReady, setIsColumnsReady] = useState(false);

  const columns = useMemo(
    () => [...columnDefs].sort((a, b) => a.ordem - b.ordem).map((item) => item.nome),
    [columnDefs]
  );
  const orderedColumnDefs = useMemo(
    () => [...columnDefs].sort((a, b) => a.ordem - b.ordem),
    [columnDefs]
  );
  const defaultColumnName = columns[0] || "Novo";

  const densityPresets = {
    compacto: {
      columnWidth: "320px",
      cardMinWidth: "294px",
      cardPadding: "12px 11px",
      columnMinHeight: "500px",
      columnPadding: "8px",
      metaFontSize: "11px",
    },
    medio: {
      columnWidth: "360px",
      cardMinWidth: "330px",
      cardPadding: "16px 14px",
      columnMinHeight: "540px",
      columnPadding: "10px",
      metaFontSize: "12px",
    },
    confortavel: {
      columnWidth: "390px",
      cardMinWidth: "360px",
      cardPadding: "18px 16px",
      columnMinHeight: "590px",
      columnPadding: "12px",
      metaFontSize: "12px",
    },
  };

  const densityCfg = densityPresets[density] || densityPresets.confortavel;

  // Configuração dos sensores para drag and drop (apenas pointer/mouse)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  // Manipulador de início de arrasto
  const handleDragStart = (event) => {
    setActiveId(event.active.id); // Armazena ID do card sendo arrastado
  };

  // Manipulador de fim de arrasto - atualiza o status do card quando solto em uma coluna
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !active) return;

    // Verifica se soltou em uma coluna (IDs começam com "column-")
    if (String(over.id).startsWith("column-")) {
      const targetColumnId = Number(String(over.id).replace("column-", ""));
      const targetColumn = columnDefs.find((item) => item.id === targetColumnId);
      if (!targetColumn) return;
      const movedCard = cards.find((card) => getCardKey(card) === active.id);
      const movedCardColumnId = getCardColumnId(movedCard);
      
      // Se a coluna é diferente, atualiza
      if (movedCard && movedCardColumnId !== targetColumn.id) {
        const optimisticCard = {
          ...movedCard,
          status: targetColumn.nome,
          coluna: targetColumn.nome,
          coluna_id: targetColumn?.id ?? movedCard?.coluna_id,
          colunaId: targetColumn?.id ?? movedCard?.colunaId,
        };

        setCards((prev) => prev.map((card) => (getCardKey(card) === getCardKey(movedCard) ? optimisticCard : card)));

        if (selectedCard && getCardKey(selectedCard) === getCardKey(movedCard)) {
          setSelectedCard(optimisticCard);
          setStatusEdit(String(targetColumn.id));
        }

        try {
          // Envia requisição PUT priorizando coluna_id como fonte de verdade
          const response = await api.put(`/cards/${getCardKey(movedCard)}`, {
            coluna_id: targetColumn?.id,
          });
          const updatedCard = response.data;
          
          // Atualiza o estado local com o card modificado
          promoteUpdatedCardToTop(updatedCard);
          
          // Se o card selecionado foi movido, atualiza também no modal de detalhes
          if (selectedCard && getCardKey(selectedCard) === getCardKey(updatedCard)) {
            setSelectedCard(updatedCard);
            setStatusEdit(String(getCardColumnId(updatedCard) || ""));
          }
        } catch (e) {
          setCards((prev) => prev.map((card) => (getCardKey(card) === getCardKey(movedCard) ? movedCard : card)));

          if (selectedCard && getCardKey(selectedCard) === getCardKey(movedCard)) {
            setSelectedCard(movedCard);
            setStatusEdit(String(getCardColumnId(movedCard) || ""));
          }

          console.error("Falha ao mover card", e);
        }
      }
    }
  };

  // Recupera dados do usuário logado do localStorage
  const userData = JSON.parse(localStorage.getItem("user") || "null");
  const seller = userData?.nome || userData?.username || userData?.email || "Sem vendedor";
  const sellerId = userData?._id || userData?.id || null;

  const mentionProfileLookup = useMemo(() => {
    const map = new Map();

    const upsertProfile = (candidate) => {
      const name = String(candidate?.name || candidate?.nome || candidate?.author || "").trim();
      if (!name) return;

      const normalized = normalizePersonName(name);
      if (!normalized) return;

      const nextProfile = {
        name,
        avatar: candidate?.avatar || candidate?.authorAvatar || "",
        role: candidate?.perfil || candidate?.role || "",
      };

      const existing = map.get(normalized);
      if (!existing) {
        map.set(normalized, nextProfile);
        return;
      }

      map.set(normalized, {
        name: existing.name || nextProfile.name,
        avatar: existing.avatar || nextProfile.avatar,
        role: existing.role || nextProfile.role,
      });
    };

    upsertProfile({
      name: userData?.nome || userData?.username || userData?.email,
      avatar: userData?.avatar,
      perfil: userData?.perfil,
    });

    directoryUsers.forEach((user) => upsertProfile(user));

    cards.forEach((card) => {
      upsertProfile(card?.vendedor);
      (card?.comments || []).forEach((comment) => {
        upsertProfile({ name: comment?.author, avatar: comment?.authorAvatar });
      });
    });

    return map;
  }, [cards, directoryUsers, userData]);

  const mentionUsers = Array.from(mentionProfileLookup.values()).map((item) => item.name);

  const vendorOptions = useMemo(() => {
    const source = Array.isArray(directoryUsers) ? directoryUsers : [];
    return source.map((user) => ({
      id: String(user?._id || user?.id || ""),
      label: user?.nome || user?.username || user?.email || "Usuário",
      perfil: user?.perfil || "",
    })).filter((item) => item.id);
  }, [directoryUsers]);

  const selectedVendorOption = useMemo(
    () => vendorOptions.find((item) => item.id === String(newCard.vendedorId || "")) || null,
    [vendorOptions, newCard.vendedorId]
  );

  const selectedDetailVendor = useMemo(
    () => vendorOptions.find((item) => item.id === String(vendorEdit || "")) || null,
    [vendorOptions, vendorEdit]
  );

  const currentDetailVendor = useMemo(() => {
    const vendorId = String(selectedCard?.vendedor?.id || selectedCard?.vendedor_id || selectedCard?.vendedorId || "");
    return vendorOptions.find((item) => item.id === vendorId) || null;
  }, [vendorOptions, selectedCard]);

  const filteredCreateVendors = useMemo(() => {
    const query = vendorSearchCreate.trim().toLowerCase();
    if (!query) return vendorOptions;
    return vendorOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [vendorOptions, vendorSearchCreate]);

  const filteredDetailVendors = useMemo(() => {
    const query = vendorSearchDetails.trim().toLowerCase();
    if (!query) return vendorOptions;
    return vendorOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [vendorOptions, vendorSearchDetails]);

  // Efeito para carregar cards da API ao montar o componente
  useEffect(() => {
    api.get("/cards")
      .then((res) => setCards(res.data))
      .catch((err) => console.log(err));
  }, []);

  const loadColumnsFromApi = useCallback(async () => {
    try {
      const res = await api.get("/columns");
      const incoming = Array.isArray(res.data) ? res.data : [];
      const normalized = incoming
        .map((item, index) => normalizeColumnEntity(item, index))
        .filter((item) => item.nome);

      setColumnDefs(normalized);
      setIsColumnsReady(true);

      if (normalized.length === 0) {
        setError("A API não retornou colunas. Verifique seed/migrações da tabela columns.");
      }

      return normalized;
    } catch {
      setColumnDefs([]);
      setIsColumnsReady(false);
      const apiBase = api?.defaults?.baseURL || "API";
      setError(`Não foi possível carregar colunas da API (${apiBase}). Verifique backend e VITE_API_URL.`);
      return [];
    }
  }, []);

  useEffect(() => {
    loadColumnsFromApi();
  }, [loadColumnsFromApi]);

  useEffect(() => {
    const fetchDirectoryUsers = async () => {
      try {
        const response = await api.get("/users/assignable");
        const users = Array.isArray(response?.data) ? response.data : [];
        setDirectoryUsers(users);
      } catch {
        try {
          const fallback = await api.get("/users/admin", {
            params: { page: 1, limit: 200, sortBy: "nome", sortOrder: "asc" },
          });

          const users = Array.isArray(fallback?.data?.data)
            ? fallback.data.data
            : Array.isArray(fallback?.data)
              ? fallback.data
              : [];

          setDirectoryUsers(users);
        } catch {
          setDirectoryUsers([]);
        }
      }
    };

    fetchDirectoryUsers();
  }, []);

  useEffect(() => {
    if (!columns.includes(importDefaultStatus)) {
      setImportDefaultStatus(defaultColumnName);
    }
  }, [columns, importDefaultStatus, defaultColumnName]);

  useEffect(() => {
    if (!statusFilter) return;
    if (/^\d+$/.test(String(statusFilter))) return;

    const legacy = orderedColumnDefs.find(
      (item) => item.nome.toLowerCase() === String(statusFilter).toLowerCase()
    );

    if (legacy?.id) {
      setStatusFilter(String(legacy.id));
    }
  }, [statusFilter, orderedColumnDefs]);

  useEffect(() => {
    localStorage.setItem(
      KANBAN_PREFS_KEY,
      JSON.stringify({ density, searchTerm, statusFilter, vendorFilter })
    );
  }, [density, searchTerm, statusFilter, vendorFilter]);

  useEffect(() => {
    localStorage.setItem(
      KANBAN_TRELLO_PREFS_KEY,
      JSON.stringify({
        boardRef: trelloBoardRef,
        key: trelloKey,
        token: trelloToken,
      })
    );
  }, [trelloBoardRef, trelloKey, trelloToken]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTimeTick((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const focusCardById = useCallback((pendingCardId) => {
    if (!pendingCardId || cards.length === 0) return false;

    const targetCard = cards.find((card) => String(getCardKey(card)) === String(pendingCardId));
    if (!targetCard) return false;

    // Garante que o card esteja visível mesmo com filtros ativos
    setSearchTerm("");
    setStatusFilter("");
    setVendorFilter("");

    setSelectedCard(targetCard);
    setStatusEdit(String(getCardColumnId(targetCard) || ""));
    setTargetedCardId(String(getCardKey(targetCard)));

    requestAnimationFrame(() => {
      const domId = getCardDomId(getCardKey(targetCard));
      const cardElement = document.getElementById(domId);
      cardElement?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });

    setTimeout(() => {
      setTargetedCardId((current) => (current === String(getCardKey(targetCard)) ? null : current));
    }, 1400);

    return true;
  }, [cards]);

  // Deep link: abre o card automaticamente se o hash da URL for #card-ID
  useEffect(() => {
    let pendingCardId = localStorage.getItem(KANBAN_FOCUS_CARD_KEY);
    // Se não houver no localStorage, tenta pelo hash da URL
    if (!pendingCardId && window.location.hash.startsWith('#card-')) {
      pendingCardId = window.location.hash.replace('#card-', '').trim();
    }
    if (!pendingCardId) return;

    const focused = focusCardById(pendingCardId);
    if (focused) {
      localStorage.removeItem(KANBAN_FOCUS_CARD_KEY);
      // Limpa o hash da URL após abrir o card
      if (window.location.hash.startsWith('#card-')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [cards, focusCardById]);

  useEffect(() => {
    const handleFocusEvent = (event) => {
      const eventCardId = String(event?.detail?.cardId || "").trim();
      const pendingCardId = eventCardId || localStorage.getItem(KANBAN_FOCUS_CARD_KEY);
      if (!pendingCardId) return;

      const focused = focusCardById(pendingCardId);
      if (focused) {
        localStorage.removeItem(KANBAN_FOCUS_CARD_KEY);
      }
    };

    window.addEventListener(KANBAN_FOCUS_EVENT, handleFocusEvent);
    return () => window.removeEventListener(KANBAN_FOCUS_EVENT, handleFocusEvent);
  }, [focusCardById]);
  
  // Estados para controle do modal de colunas
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [columnModalType, setColumnModalType] = useState("add"); // add | edit
  const [columnName, setColumnName] = useState("");
  const [editingColumnId, setEditingColumnId] = useState(null);
  
  // CRUD de colunas - funções para gerenciar colunas dinâmicas
  
  // Abre modal para adicionar nova coluna
  const openAddColumn = () => {
    setColumnModalType("add");
    setColumnName("");
    setIsColumnModalOpen(true);
    setEditingColumnId(null);
  };
  
  // Abre modal para editar coluna existente
  const openEditColumn = (column) => {
    setColumnModalType("edit");
    setColumnName(column?.nome || "");
    setIsColumnModalOpen(true);
    setEditingColumnId(column?.id ?? null);
  };

  const persistColumnOrder = async (orderedColumnDefs) => {
    if (!isColumnsReady) {
      setError("As colunas ainda não foram carregadas da API.");
      return;
    }

    const orderedIds = orderedColumnDefs.map((item) => item.id).filter(Boolean);
    if (orderedIds.length !== orderedColumnDefs.length) return;

    try {
      const response = await api.put("/columns/reorder", { ids: orderedIds });
      const normalized = (Array.isArray(response.data) ? response.data : [])
        .map((item, index) => normalizeColumnEntity(item, index))
        .filter((item) => item.nome);
      if (normalized.length > 0) {
        setColumnDefs(normalized);
      }
    } catch {
      setError("Não foi possível salvar a ordenação das colunas.");
      await loadColumnsFromApi();
    }
  };

  const moveColumn = async (fromIndex, toIndex) => {
    if (!isColumnsReady) {
      setError("As colunas ainda não foram carregadas da API.");
      return;
    }

    if (toIndex < 0 || toIndex >= columnDefs.length) return;

    const reordered = [...columnDefs];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const optimistic = reordered.map((item, index) => ({ ...item, ordem: index }));
    setColumnDefs(optimistic);
    await persistColumnOrder(optimistic);
  };

  const handleColumnDragStart = (index) => {
    setDraggedColumnIndex(index);
  };

  const handleColumnDrop = async (targetIndex) => {
    if (draggedColumnIndex === null || draggedColumnIndex === targetIndex) {
      setDraggedColumnIndex(null);
      return;
    }

    await moveColumn(draggedColumnIndex, targetIndex);
    setDraggedColumnIndex(null);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnIndex(null);
  };
  
  // Salva coluna (nova ou editada)
  const handleSaveColumn = async () => {
    const name = columnName.trim();
    if (!name) return;
    if (!isColumnsReady) {
      setError("As colunas ainda não foram carregadas da API.");
      return;
    }

    try {
      if (columnModalType === "add") {
        await api.post("/columns", { nome: name });
        await loadColumnsFromApi();
      } else if (columnModalType === "edit" && editingColumnId !== null) {
        const target = columnDefs.find((item) => item.id === editingColumnId);
        if (!target?.id) return;
        const response = await api.put(`/columns/${target.id}`, { nome: name, ordem: target.ordem });
        normalizeColumnEntity(response.data, target.ordem);
        await loadColumnsFromApi();
      }

      setIsColumnModalOpen(false);
      setColumnName("");
      setEditingColumnId(null);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.message || "Erro ao salvar coluna.");
    }
  };
  
  // Exclui coluna (apenas se não tiver cards)
  const handleDeleteColumn = async (column) => {
    if (!isColumnsReady) {
      setError("As colunas ainda não foram carregadas da API.");
      return;
    }

    const target = columnDefs.find((item) => item.id === column?.id);
    if (!target) return;

    const hasCards = cards.some((c) => {
      const cardColumnId = getCardColumnId(c);
      return cardColumnId === target.id;
    });
    if (hasCards) {
      alert("Não é possível excluir uma coluna que possui cards. Mova os cards antes.");
      return;
    }

    try {
      await api.delete(`/columns/${target.id}`);
      await loadColumnsFromApi();
    } catch (err) {
      setError(err?.response?.data?.message || "Erro ao excluir coluna.");
    }
  };

  const handleDeleteAllCardsInColumn = async (column) => {
    const cardsInColumn = cards.filter((card) => {
      const cardColumnId = getCardColumnId(card);
      return cardColumnId === column.id;
    });
    if (cardsInColumn.length === 0) {
      alert("Essa coluna não possui cards para excluir.");
      return;
    }

    const confirmed = window.confirm(
      `Excluir TODOS os ${cardsInColumn.length} card(s) da coluna \"${column.nome}\"? Essa ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setError("");
    setIsBulkDeletingCards(true);

    try {
      const results = await Promise.allSettled(
        cardsInColumn.map((card) => api.delete(`/cards/${getCardKey(card)}`))
      );

      const deletedIds = cardsInColumn
        .filter((_, index) => results[index]?.status === "fulfilled")
        .map((card) => getCardKey(card));

      const failedCount = cardsInColumn.length - deletedIds.length;

      if (deletedIds.length > 0) {
        setCards((prev) => prev.filter((card) => !deletedIds.includes(getCardKey(card))));

        if (selectedCard && deletedIds.includes(getCardKey(selectedCard))) {
          handleCloseCard();
        }
      }

      if (failedCount > 0) {
        setError(`Alguns cards não puderam ser removidos (${failedCount}). Tente novamente.`);
      }
    } catch {
      setError("Erro ao excluir todos os cards da coluna.");
    } finally {
      setIsBulkDeletingCards(false);
    }
  };

  // Manipulador de mudanças nos campos do formulário de novo card
  const handleInputChange = (field, value) => {
    // Tratamento especial para coordenadas
    if (field === "lat" || field === "lng") {
      setNewCard((prev) => ({
        ...prev,
        coordenadas: {
          ...prev.coordenadas,
          [field]: value,
        },
      }));
    } else {
      setNewCard((prev) => ({ ...prev, [field]: value }));
    }
    setError(""); // Limpa erro ao modificar campos
  };

  const handleCreateFieldFocus = (event) => {
    event.currentTarget.style.borderColor = "#8d76ff";
    event.currentTarget.style.boxShadow = "0 0 0 3px rgba(124, 91, 255, 0.16)";
  };

  const handleCreateFieldBlur = (event) => {
    event.currentTarget.style.borderColor = "#d9d0f9";
    event.currentTarget.style.boxShadow = "none";
  };

  // Abre modal de detalhes do card
  const handleOpenCard = (card) => {
    console.log('[Detalhes] handleOpenCard chamado', card);
    setSelectedCard(card);
    setStatusEdit(String(getCardColumnId(card) || ""));
    setVendorEdit(String(card?.vendedor?.id || card?.vendedor_id || ""));
    setVendorSearchDetails("");
    setCommentText("");
    setIsCommentComposerOpen(false);
    setPendingAttachment(null);
  };

  // Fecha modal de detalhes
  const handleCloseCard = () => {
    console.log('[Detalhes] Fechando modal de detalhes');
    setSelectedCard(null);
    setVendorEdit("");
    setVendorSearchDetails("");
    setCommentText("");
    setIsCommentComposerOpen(false);
    setReplyDraftByCommentId({});
    setActiveReplyCommentId(null);
    setEditingReplyKey(null);
    setEditingReplyText("");
    setPendingAttachment(null);
    setPreviewImage(null);
    setPreviewZoom(1);
  };

  useEffect(() => {
    if (!previewImage) return;

    const handleEscToClose = (event) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
        setPreviewZoom(1);
      }
    };

    window.addEventListener("keydown", handleEscToClose);
    return () => window.removeEventListener("keydown", handleEscToClose);
  }, [previewImage]);

  const persistCommentsOnSelectedCard = async (nextComments) => {
    if (!selectedCard) return null;

    const cardUpdate = {
      comments: nextComments,
      colunaId: getCardColumnId(selectedCard),
    };

    const response = await api.put(`/cards/${getCardKey(selectedCard)}`, cardUpdate);
    const updatedCard = response.data;
    promoteUpdatedCardToTop(updatedCard);
    setSelectedCard(updatedCard);
    return updatedCard;
  };

  const handleToggleReaction = async (commentId, emoji) => {
    if (!selectedCard) return;
    const reactionUser = userData?.nome || userData?.username || userData?.email || `user-${sellerId || "anon"}`;
    const reactionUserKey = getReactionUserKey(reactionUser);
    const reactionUserDisplay = getReactionUserDisplayName(reactionUser);
    const currentComments = Array.isArray(selectedCard.comments) ? selectedCard.comments : [];

    const nextComments = currentComments.map((comment) => {
      if (String(comment.id) !== String(commentId)) return comment;

      const reactions = comment?.reactions && typeof comment.reactions === "object" ? { ...comment.reactions } : {};
      const currentUsers = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
      const alreadyReacted = currentUsers.some((name) => getReactionUserKey(name) === reactionUserKey);

      const nextUsers = alreadyReacted
        ? currentUsers.filter((name) => getReactionUserKey(name) !== reactionUserKey)
        : [...currentUsers, reactionUserDisplay];

      if (nextUsers.length > 0) reactions[emoji] = nextUsers;
      else delete reactions[emoji];

      return {
        ...comment,
        reactions,
      };
    });

    try {
      await persistCommentsOnSelectedCard(nextComments);
    } catch {
      setError("Erro ao reagir ao comentário");
    }
  };

  const handleAddReply = async (commentId) => {
    if (!selectedCard) return;
    const rawReply = String(replyDraftByCommentId?.[commentId] || "").trim();
    if (!rawReply) return;

    const author = userData?.nome || userData?.username || userData?.email || "Usuário";
    const authorAvatar = userData?.avatar || "";
    const nowIso = new Date().toISOString();

    const currentComments = Array.isArray(selectedCard.comments) ? selectedCard.comments : [];
    const nextComments = currentComments.map((comment) => {
      if (String(comment.id) !== String(commentId)) return comment;

      const replies = Array.isArray(comment.replies) ? [...comment.replies] : [];
      replies.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: rawReply,
        author,
        authorAvatar,
        createdAt: nowIso,
      });

      return {
        ...comment,
        replies,
      };
    });

    try {
      await persistCommentsOnSelectedCard(nextComments);
      setReplyDraftByCommentId((prev) => ({ ...prev, [commentId]: "" }));
      setActiveReplyCommentId(null);
    } catch {
      setError("Erro ao responder comentário");
    }
  };

  const getReplyEditKey = (commentId, replyId) => `${String(commentId)}::${String(replyId)}`;

  const handleStartEditReply = (commentId, reply) => {
    setEditingReplyKey(getReplyEditKey(commentId, reply?.id));
    setEditingReplyText(String(reply?.text || ""));
  };

  const handleCancelEditReply = () => {
    setEditingReplyKey(null);
    setEditingReplyText("");
  };

  const handleSaveEditReply = async (commentId, replyId) => {
    if (!selectedCard) return;

    const nextText = String(editingReplyText || "").trim();
    if (!nextText) return;

    const currentComments = Array.isArray(selectedCard.comments) ? selectedCard.comments : [];
    const nowIso = new Date().toISOString();
    const nextComments = currentComments.map((comment) => {
      if (String(comment.id) !== String(commentId)) return comment;

      const currentReplies = Array.isArray(comment.replies) ? comment.replies : [];
      const replies = currentReplies.map((reply) => {
        if (String(reply.id) !== String(replyId)) return reply;

        return {
          ...reply,
          text: nextText,
          editedAt: nowIso,
        };
      });

      return {
        ...comment,
        replies,
      };
    });

    try {
      await persistCommentsOnSelectedCard(nextComments);
      handleCancelEditReply();
    } catch {
      setError("Erro ao editar resposta");
    }
  };

  const handleDeleteReply = async (commentId, replyId) => {
    if (!selectedCard) return;

    const confirmed = window.confirm("Tem certeza que deseja excluir esta resposta?");
    if (!confirmed) return;

    const currentComments = Array.isArray(selectedCard.comments) ? selectedCard.comments : [];
    const nextComments = currentComments.map((comment) => {
      if (String(comment.id) !== String(commentId)) return comment;

      const currentReplies = Array.isArray(comment.replies) ? comment.replies : [];
      const replies = currentReplies.filter((reply) => String(reply.id) !== String(replyId));

      return {
        ...comment,
        replies,
      };
    });

    try {
      await persistCommentsOnSelectedCard(nextComments);
      if (editingReplyKey === getReplyEditKey(commentId, replyId)) {
        handleCancelEditReply();
      }
    } catch {
      setError("Erro ao excluir resposta");
    }
  };

  const handleChangeVendor = async () => {
    if (!selectedCard) return;
    if (!vendorEdit) {
      setError("Selecione um vendedor válido.");
      return;
    }

    try {
      await handleSaveCardChanges({ vendedor_id: Number(vendorEdit) });
      setError("");
    } catch {
      setError("Erro ao atualizar vendedor.");
    }
  };

  const handleAttachmentSelect = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result;
      if (!base64) return;
      setPendingAttachment({ name: file.name, type: file.type, data: base64 });
    };
    reader.readAsDataURL(file);
  };

  const getAvatarInitials = (name) => {
    const safeName = String(name || "Usuário").trim();
    if (!safeName) return "U";
    return safeName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "U";
  };

  // Adiciona comentário ao card
  const handleAddComment = async () => {
    if (!selectedCard) return;

    const normalizedText = commentText.trim();
    if (!normalizedText && !pendingAttachment) return;

    // Recupera dados do usuário para identificar autor
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    const author = userData?.nome || userData?.username || userData?.email || "Usuário";
    const authorAvatar = userData?.avatar || "";

    // Cria novo comentário
    const newComment = {
      id: Date.now(), // ID temporário baseado no timestamp
      text: normalizedText,
      author,
      authorAvatar,
      createdAt: new Date().toISOString(),
      ...(pendingAttachment ? { attachment: pendingAttachment } : {}),
    };

    const updatedComments = [...(selectedCard.comments || []), newComment];

    try {
      // Envia para API
      await persistCommentsOnSelectedCard(updatedComments);
      setCommentText(""); // Limpa campo de comentário
      setIsCommentComposerOpen(false);
      setPendingAttachment(null);
    } catch (err) {
      console.error("erro ao adicionar comentário", err);
      setError("Erro ao adicionar comentário");
    }
  };

  // Salva alterações gerais do card
  const handleSaveCardChanges = async (updates = {}) => {
    if (!selectedCard) return;

    const payload = { ...updates };
    const explicitColumnId = updates?.colunaId ?? updates?.coluna_id;

    if (explicitColumnId !== undefined && explicitColumnId !== null && String(explicitColumnId).trim() !== "") {
      payload.colunaId = Number(explicitColumnId);
    } else {
      const requestedColumnName = String(updates?.status || updates?.coluna || "").trim();
      if (requestedColumnName) {
        const target = columnDefs.find((item) => item.nome === requestedColumnName);
        if (!target?.id) {
          setError("Coluna inválida para atualização do card.");
          return;
        }
        payload.colunaId = target.id;
      } else {
        const currentColumnId = getCardColumnId(selectedCard);
        if (currentColumnId) {
          payload.colunaId = currentColumnId;
        }
      }
    }

    delete payload.status;
    delete payload.coluna;

    try {
      const response = await api.put(`/cards/${getCardKey(selectedCard)}`, payload);
      const updatedCard = response.data;
      promoteUpdatedCardToTop(updatedCard);
      setSelectedCard(updatedCard);
    } catch (err) {
      console.error("Erro ao salvar alterações do card", err);
      setError("Erro ao salvar alterações");
    }
  };

  // Exclui card permanentemente
  const handleDeleteCard = async () => {
    if (!selectedCard) return;

    try {
      await api.delete(`/cards/${getCardKey(selectedCard)}`);
      setCards((prev) => prev.filter((c) => getCardKey(c) !== getCardKey(selectedCard)));
      handleCloseCard(); // Fecha modal após exclusão
    } catch (err) {
      console.error("Erro ao deletar card", err);
      setError("Erro ao deletar card");
    }
  };

  // Duplica card (cria cópia)
  const handleDuplicateCard = async () => {
    if (!selectedCard) return;

    // Remove campos de identificação única e reseta status
    const duplicatePayload = {
      ...selectedCard,
      id: undefined,
      _id: undefined,
      titulo: `${selectedCard.titulo || selectedCard.cliente || "Card"} (cópia)`, // Adiciona "(cópia)" ao título
      colunaId: columnDefs.find((item) => item.nome === defaultColumnName)?.id,
      createdAt: undefined,    // Remove timestamps
      updatedAt: undefined,
    };

    delete duplicatePayload.status;
    delete duplicatePayload.coluna;

    try {
      const response = await api.post("/cards", duplicatePayload);
      setCards((prev) => [response.data, ...prev]); // Adiciona no início da lista
      handleCloseCard();
    } catch (err) {
      console.error("Erro ao duplicar card", err);
      setError("Erro ao duplicar card");
    }
  };

  // Altera status do card
  const handleChangeStatus = async (newColumnId) => {
    if (!selectedCard) return;
    await handleSaveCardChanges({ colunaId: Number(newColumnId) });
  };

  // Cria novo card com validação de campos obrigatórios
  const handleCreateCard = async () => {
    const { cliente, telefone, endereco, tipoServico, colunaId } = newCard;
    // Validação detalhada de campos obrigatórios
    if (!cliente || !cliente.trim()) {
      setError("Cliente é obrigatório");
      return;
    }
    if (!telefone || !telefone.trim()) {
      setError("Telefone é obrigatório");
      return;
    }
    if (!endereco || !endereco.trim()) {
      setError("Endereço é obrigatório");
      return;
    }
    if (!tipoServico || !tipoServico.trim()) {
      setError("Tipo de serviço é obrigatório");
      return;
    }
    if (!colunaId || !Number.isFinite(Number(colunaId))) {
      setError("Selecione a etapa inicial do card");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      // Verifica autenticação do usuário
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      if (!userData) {
        setError("Usuário não autenticado. Faça login novamente.");
        setIsCreating(false);
        return;
      }

      // Prepara payload para envio
      const payload = {
        titulo: newCard.titulo?.trim() || "",
        cliente: newCard.cliente.trim(),
        telefone: newCard.telefone.trim(),
        endereco: newCard.endereco.trim(),
        tipoServico: newCard.tipoServico.trim(),
        tipo_card: newCard.tipo_card || "",
        mensalidade: newCard.mensalidade ? Number(newCard.mensalidade) : 0,
        instalacao: newCard.instalacao ? Number(newCard.instalacao) : 0,
        tempoContratual: newCard.tempoContratual ? Number(newCard.tempoContratual) : 0,
        sla: newCard.sla ? Number(newCard.sla) : 0,
        prazo: newCard.prazo || null,
        observacoes: newCard.observacoes?.trim() || "",
        coordenadas: {
          lat: newCard.coordenadas.lat?.trim() || "",
          lng: newCard.coordenadas.lng?.trim() || "",
        },
        colunaId: Number(colunaId),
        vendedorId: newCard.vendedorId || sellerId,
        ip: "",
        comments: []
      };

      console.log("Enviando payload:", payload);

      // Envia requisição POST para criar card
      const response = await api.post("/cards", payload);
      
      if (response.data) {
        setCards((prev) => [response.data, ...prev]); // Adiciona ao início
        setIsModalOpen(false); // Fecha modal
        
        // Reseta formulário
        setNewCard({
          titulo: "",
          cliente: "",
          telefone: "",
          endereco: "",
          coordenadas: { lat: "", lng: "" },
          tipoServico: "",
          mensalidade: "",
          instalacao: "",
          sla: 0,
          prazo: "",
          observacoes: "",
          vendedorId: "",
        });
        setVendorSearchCreate("");
        setError("");
      }
    } catch (e) {
      console.error("Erro detalhado ao criar card:", e);
      
      // Tratamento detalhado de diferentes tipos de erro
      if (e.response) {
        // Erro com resposta do servidor
        console.log("Resposta do servidor:", e.response.data);
        console.log("Status do erro:", e.response.status);
        
        // Tratamento específico baseado no código de status HTTP
        if (e.response.status === 400) {
          setError(`Erro de validação: ${e.response.data.message || "Verifique os campos preenchidos"}`);
        } else if (e.response.status === 401) {
          setError("Sessão expirada. Faça login novamente.");
        } else if (e.response.status === 500) {
          setError("Erro no servidor. Tente novamente mais tarde.");
        } else {
          setError(`Erro ${e.response.status}: ${e.response.data?.message || "Não foi possível criar o card"}`);
        }
      } else if (e.request) {
        // Erro de rede - requisição foi feita mas não houve resposta
        setError("Erro de conexão. Verifique sua internet e se o servidor está rodando.");
      } else {
        // Outros tipos de erro
        setError(`Erro: ${e.message}`);
      }
    } finally {
      setIsCreating(false); // Libera o botão de criação independente do resultado
    }
  };

  const handleLoadImportFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImportRaw(String(e.target?.result || ""));
      setImportSummary("");
    };
    reader.readAsText(file);
  };

  const importCardsFromParsed = async (parsed) => {
    const fallbackStatus = normalizeImportStatus(importDefaultStatus, columns, defaultColumnName);
    const extracted = extractImportCards(parsed, columns, fallbackStatus);
    const fallbackColumn = orderedColumnDefs[0] || null;
    const columnIdByName = new Map(
      orderedColumnDefs.map((column) => [String(column.nome || "").trim().toLowerCase(), Number(column.id)])
    );

    if (extracted.length === 0) {
      setError("Nenhum card encontrado no JSON. Use um array de cards ou export do Trello.");
      return false;
    }

    const payloads = extracted
      .map(({ card, status }) => {
        const basePayload = mapImportedCard({ card, status, seller, sellerId });
        const resolvedColumnId = columnIdByName.get(String(status || "").trim().toLowerCase()) || Number(fallbackColumn?.id);

        if (!Number.isFinite(resolvedColumnId)) {
          return null;
        }

        return {
          ...basePayload,
          colunaId: resolvedColumnId,
        };
      })
      .filter(Boolean)
      .map((payload) => {
        const nextPayload = { ...payload };
        delete nextPayload.status;
        delete nextPayload.coluna;
        return nextPayload;
      });

    if (payloads.length === 0) {
      setError("Não foi possível mapear as colunas importadas para IDs válidos.");
      return false;
    }

    const results = await Promise.allSettled(payloads.map((payload) => api.post("/cards", payload)));
    const createdCards = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value.data);

    const failedCount = results.length - createdCards.length;

    if (createdCards.length > 0) {
      setCards((prev) => [...createdCards, ...prev]);
    }

    setImportSummary(`Importação finalizada: ${createdCards.length} criado(s), ${failedCount} falha(s).`);
    return true;
  };

  const handleImportCards = async () => {
    setError("");
    setImportSummary("");
    setExternalExportSummary("");

    if (!importRaw.trim()) {
      setError("Cole um JSON ou selecione um arquivo para importar.");
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(importRaw);
    } catch {
      setError("JSON inválido. Verifique o conteúdo e tente novamente.");
      return;
    }

    setIsImporting(true);
    try {
      await importCardsFromParsed(parsed);
    } catch (importError) {
      console.error("Erro ao importar cards", importError);
      setError("Erro ao importar cards. Tente novamente.");
    } finally {
      setIsImporting(false);
    }
  };

  const fetchTrelloExportPayload = async () => {
    const boardId = parseTrelloBoardId(trelloBoardRef);
    const key = String(trelloKey || "").trim();
    const token = String(trelloToken || "").trim();

    if (!boardId || !key || !token) {
      throw new Error("Preencha Board ID/URL, Key e Token do Trello.");
    }

    const auth = new URLSearchParams({ key, token }).toString();
    const listsUrl = `https://api.trello.com/1/boards/${boardId}/lists?${auth}&fields=id,name`;
    const cardsUrl = `https://api.trello.com/1/boards/${boardId}/cards?${auth}&fields=id,idList,name,desc,due,labels,shortUrl,dateLastActivity&attachments=true&attachment_fields=name,url,mimeType,date&members=true&member_fields=fullName,username,avatarUrl`;
    const actionsUrl = `https://api.trello.com/1/boards/${boardId}/actions?${auth}&filter=commentCard&fields=data,date,idMemberCreator&memberCreator_fields=fullName,username,avatarUrl&limit=1000`;

    const [listsRes, cardsRes, actionsRes] = await Promise.all([
      fetch(listsUrl),
      fetch(cardsUrl),
      fetch(actionsUrl),
    ]);

    if (!listsRes.ok || !cardsRes.ok || !actionsRes.ok) {
      throw new Error("Falha ao buscar dados do Trello. Confira Board/Key/Token.");
    }

    const [lists, cards, actions] = await Promise.all([listsRes.json(), cardsRes.json(), actionsRes.json()]);

    const commentsByCard = new Map();
    (Array.isArray(actions) ? actions : []).forEach((action) => {
      const cardId = action?.data?.card?.id;
      const commentText = action?.data?.text;
      if (!cardId || !commentText) return;

      const item = {
        id: action?.id || `${cardId}-${Date.now()}`,
        text: commentText,
        author: action?.memberCreator?.fullName || action?.memberCreator?.username || "Usuário Trello",
        authorAvatar: action?.memberCreator?.avatarUrl || "",
        createdAt: action?.date || new Date().toISOString(),
      };

      if (!commentsByCard.has(cardId)) {
        commentsByCard.set(cardId, []);
      }
      commentsByCard.get(cardId).push(item);
    });

    const normalizedCards = (Array.isArray(cards) ? cards : []).map((card) => {
      const attachmentNotes = (card?.attachments || [])
        .map((attachment) => `- ${attachment?.name || "Arquivo"}: ${attachment?.url || ""}`)
        .filter(Boolean)
        .join("\n");

      const extraNotes = [
        card?.desc || "",
        card?.shortUrl ? `\nLink Trello: ${card.shortUrl}` : "",
        attachmentNotes ? `\nAnexos Trello:\n${attachmentNotes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const mainMember = card?.members?.[0];

      return {
        ...card,
        titulo: card?.name || "",
        desc: extraNotes,
        observacoes: extraNotes,
        prazo: card?.due || null,
        comments: commentsByCard.get(card?.id) || [],
        vendedor: mainMember?.fullName || mainMember?.username || "",
      };
    });

    return {
      lists: Array.isArray(lists) ? lists : [],
      cards: normalizedCards,
    };
  };

  const handleImportFromTrello = async () => {
    setError("");
    setImportSummary("");
    setExternalExportSummary("");
    setIsImportingTrello(true);

    try {
      const trelloPayload = await fetchTrelloExportPayload();
      setImportRaw(JSON.stringify(trelloPayload, null, 2));
      await importCardsFromParsed(trelloPayload);
    } catch (trelloError) {
      setError(trelloError?.message || "Erro ao importar do Trello.");
    } finally {
      setIsImportingTrello(false);
    }
  };

  const parseExternalRows = () => {
    if (!importRaw.trim()) {
      setError("Cole um JSON ou selecione um arquivo para exportar.");
      return null;
    }

    let parsed;
    try {
      parsed = JSON.parse(importRaw);
    } catch {
      setError("JSON inválido. Verifique o conteúdo e tente novamente.");
      return null;
    }

    const fallbackStatus = normalizeImportStatus(importDefaultStatus, columns, defaultColumnName);
    const extracted = extractImportCards(parsed, columns, fallbackStatus);

    if (extracted.length === 0) {
      setError("Nenhum card encontrado no JSON externo para exportação.");
      return null;
    }

    return extracted.map(({ card, status }) =>
      mapImportedCard({ card, status, seller: "", sellerId: null })
    );
  };

  const handleExportExternalCsv = () => {
    setError("");
    setImportSummary("");
    setExternalExportSummary("");

    const rowsSource = parseExternalRows();
    if (!rowsSource) return;

    const header = EXPORT_FIELDS.map((field) => field.label).join(";");
    const rows = rowsSource.map((card) =>
      EXPORT_FIELDS.map((field) => escapeCsvValue(normalizeExportValue(card, field.key))).join(";")
    );
    const csvContent = [header, ...rows].join("\n");
    downloadBlobFile(csvContent, "text/csv;charset=utf-8;", `cards-externo-${new Date().toISOString().slice(0, 10)}.csv`);
    setExternalExportSummary(`Exportação externa CSV concluída: ${rowsSource.length} card(s).`);
  };

  const handleExportExternalExcel = () => {
    setError("");
    setImportSummary("");
    setExternalExportSummary("");

    const rowsSource = parseExternalRows();
    if (!rowsSource) return;

    const tableHeader = EXPORT_FIELDS.map((field) => `<th>${field.label}</th>`).join("");
    const tableRows = rowsSource
      .map((card) => {
        const cells = EXPORT_FIELDS
          .map((field) => `<td>${String(normalizeExportValue(card, field.key) ?? "")}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${tableHeader}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    downloadBlobFile(html, "application/vnd.ms-excel;charset=utf-8;", `cards-externo-${new Date().toISOString().slice(0, 10)}.xls`);
    setExternalExportSummary(`Exportação externa Excel concluída: ${rowsSource.length} card(s).`);
  };

  const handleExportCsv = () => {
    if (!cards.length) {
      setError("Não há cards para exportar.");
      return;
    }

    const header = EXPORT_FIELDS.map((field) => field.label).join(";");
    const rows = cards.map((card) =>
      EXPORT_FIELDS.map((field) => escapeCsvValue(normalizeExportValue(card, field.key))).join(";")
    );
    const csvContent = [header, ...rows].join("\n");
    downloadBlobFile(csvContent, "text/csv;charset=utf-8;", `cards-kanban-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportExcel = () => {
    if (!cards.length) {
      setError("Não há cards para exportar.");
      return;
    }

    const tableHeader = EXPORT_FIELDS.map((field) => `<th>${field.label}</th>`).join("");
    const tableRows = cards
      .map((card) => {
        const cells = EXPORT_FIELDS
          .map((field) => `<td>${String(normalizeExportValue(card, field.key) ?? "")}</td>`)
          .join("");
        return `<tr>${cells}</tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${tableHeader}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    downloadBlobFile(html, "application/vnd.ms-excel;charset=utf-8;", `cards-kanban-${new Date().toISOString().slice(0, 10)}.xls`);
  };

  // Filtra cards para uma coluna específica com base nos filtros ativos
  const cardsByColumn = useMemo(() => {
    const grouped = Object.fromEntries(
      orderedColumnDefs.map((column) => [String(column.id), []])
    );
    const normalizedSearch = searchTerm.trim().toLowerCase();

    cards.forEach((card) => {
      let matches = true;

      if (normalizedSearch) {
        matches = (
          (card.cliente || "").toLowerCase().includes(normalizedSearch) ||
          (card.titulo || "").toLowerCase().includes(normalizedSearch) ||
          (card.telefone || "").toLowerCase().includes(normalizedSearch) ||
          (card.endereco || "").toLowerCase().includes(normalizedSearch)
        );
      }

      if (matches && statusFilter) {
        const filterColumnId = Number(statusFilter);
        const cardColumnId = getCardColumnId(card);
        matches = Number.isFinite(filterColumnId) && cardColumnId === filterColumnId;
      }

      if (matches && vendorFilter) {
        const vendorName = card.vendedor?.nome || card.vendedor || card.vendedorId || "Sem vendedor";
        matches = vendorName === vendorFilter;
      }

      if (!matches) return;

      let targetColumnId = getCardColumnId(card);

      if (!targetColumnId) return;

      const bucketKey = String(targetColumnId);
      if (!grouped[bucketKey]) {
        grouped[bucketKey] = [];
      }

      grouped[bucketKey].push(card);
    });

    return grouped;
  }, [cards, orderedColumnDefs, searchTerm, statusFilter, vendorFilter]);

  const activeCard = useMemo(
    () => cards.find((card) => getCardKey(card) === activeId) || null,
    [cards, activeId]
  );

  const promoteUpdatedCardToTop = (updatedCard) => {
    const updatedId = getCardKey(updatedCard);
    setCards((prev) => [updatedCard, ...prev.filter((card) => getCardKey(card) !== updatedId)]);
    setPromotedCardId(updatedId);
    setTimeout(() => {
      setPromotedCardId((current) => (current === updatedId ? null : current));
    }, 420);
  };

  // Renderização do componente principal
  return (
    <div style={styles.container}>
      <style>
        {`@keyframes promoteToTop {
          0% { transform: translateY(12px) scale(0.995); opacity: 0.92; }
          65% { transform: translateY(-1px) scale(1.004); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes focusMentionCard {
          0% { box-shadow: 0 0 0 0 rgba(127, 90, 240, 0.55), 0 8px 20px rgba(95, 61, 198, 0.2); }
          100% { box-shadow: 0 0 0 12px rgba(127, 90, 240, 0), 0 8px 20px rgba(95, 61, 198, 0.18); }
        }`}
      </style>
      {/* Cabeçalho com título e botões de ação */}
      <div style={styles.header}>
        <h1 style={styles.title}><ClipboardList size={24} style={{ marginRight: 8, verticalAlign: "text-bottom" }} />Kanban de Entregas</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={styles.densityGroup}>
            {[
              { key: "compacto", label: "Compacto" },
              { key: "medio", label: "Médio" },
              { key: "confortavel", label: "Confortável" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setDensity(item.key)}
                style={{
                  ...styles.densityButton,
                  ...(density === item.key ? styles.densityButtonActive : {}),
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          {/* Botão para criar novo card */}
          <button 
            style={styles.addButton}
            onClick={() => setIsModalOpen(true)}
            onMouseEnter={(e) => { 
              e.currentTarget.style.transform = "translateY(-2px)"; 
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(90,48,255,0.4)"; 
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.transform = "translateY(0)"; 
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(90,48,255,0.3)"; 
            }}
          >
            <Plus size={15} /> Novo Card
          </button>
          {/* Botão para adicionar nova coluna */}
          <button
            style={{ ...styles.addButton, background: "linear-gradient(135deg, #d5c9ff 0%, #8f75ff 100%)", color: "#2f1e70" }}
            onClick={openAddColumn}
          >
            <Plus size={15} /> Nova Coluna
          </button>
          <div style={{ position: "relative" }}>
            <button
              style={{ ...styles.addButton, background: "linear-gradient(135deg, #cce5ff 0%, #8ec5ff 100%)", color: "#1a3f74" }}
              onClick={() => setIsDataActionsOpen((prev) => !prev)}
            >
              <FileUp size={15} /> Dados
            </button>

            {isDataActionsOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  minWidth: "190px",
                  background: "#fff",
                  border: "1px solid #d8cffb",
                  borderRadius: 10,
                  boxShadow: "0 14px 28px rgba(56, 36, 138, 0.2)",
                  padding: 8,
                  zIndex: 20,
                  display: "grid",
                  gap: 6,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(true);
                    setImportSummary("");
                    setExternalExportSummary("");
                    setError("");
                    setIsDataActionsOpen(false);
                  }}
                  style={{ background: "#eef5ff", border: "1px solid #d0e0ff", color: "#1a3f74", borderRadius: 8, padding: "8px 10px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <FileUp size={14} /> Importar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(true);
                    setImportSummary("");
                    setExternalExportSummary("");
                    setError("");
                    setIsDataActionsOpen(false);
                  }}
                  style={{ background: "#e8f8ff", border: "1px solid #c9ebff", color: "#165d7a", borderRadius: 8, padding: "8px 10px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={14} /> Trello
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleExportExcel();
                    setIsDataActionsOpen(false);
                  }}
                  style={{ background: "#e9faed", border: "1px solid #c8efd4", color: "#1f5b2e", borderRadius: 8, padding: "8px 10px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleExportCsv();
                    setIsDataActionsOpen(false);
                  }}
                  style={{ background: "#eef4ff", border: "1px solid #d4e1ff", color: "#21468a", borderRadius: 8, padding: "8px 10px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Download size={14} /> CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Container de filtros - busca, status e vendedor */}
      <div style={styles.filterContainer}>
        {/* Campo de busca textual */}
        <input
          type="text"
          placeholder="Buscar por cliente, titulo, telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.modalInput}
        />
        
        {/* Select para filtrar por status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.modalInput}
        >
          <option value="">Todos os Status</option>
          {orderedColumnDefs.map((column) => (
            <option key={column.id} value={String(column.id)}>{column.nome}</option>
          ))}
        </select>
        
        {/* Select para filtrar por vendedor */}
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          style={styles.modalInput}
        >
          <option value="">Todos os Vendedores</option>
          {/* Extrai lista única de vendedores dos cards existentes */}
          {[...new Set(cards.map((c) => c.vendedor?.nome || c.vendedor || c.vendedorId || "Sem vendedor"))].map((vendor) => (
            <option key={vendor} value={vendor}>{vendor}</option>
          ))}
        </select>
        
        {/* Botão para limpar todos os filtros */}
        <button
          onClick={() => { setSearchTerm(""); setStatusFilter(""); setVendorFilter(""); }}
          style={styles.cancelBtn}
        >
          Limpar filtros
        </button>
      </div>

      {/* Contexto de Drag and Drop - envolve todo o Kanban */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ position: 'relative', width: '100%' }}>
          {/* Botão scroll esquerda */}
          <button
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              background: '#fff',
              border: '1px solid #d6d0ff',
              borderRadius: '50%',
              width: 38,
              height: 38,
              boxShadow: '0 2px 8px rgba(60,40,120,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: 0.85,
            }}
            onClick={() => {
              const el = document.getElementById('kanban-horizontal-scroll');
              if (el) el.scrollBy({ left: -400, behavior: 'smooth' });
            }}
            aria-label="Rolar para esquerda"
          >
            ←
          </button>
          {/* Botão scroll direita */}
          <button
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              background: '#fff',
              border: '1px solid #d6d0ff',
              borderRadius: '50%',
              width: 38,
              height: 38,
              boxShadow: '0 2px 8px rgba(60,40,120,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: 0.85,
            }}
            onClick={() => {
              const el = document.getElementById('kanban-horizontal-scroll');
              if (el) el.scrollBy({ left: 400, behavior: 'smooth' });
            }}
            aria-label="Rolar para direita"
          >
            →
          </button>
          <div
            id="kanban-horizontal-scroll"
            style={{
              ...styles.tableContainer,
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 15,
              marginBottom: 0,
              maxHeight: '70vh',
              minHeight: 0,
              boxShadow: '0 -2px 12px 0 rgba(60,47,140,0.04)',
              background: 'inherit',
              overflowY: 'auto',
            }}
          >
            <table style={styles.table}>
              <thead>
                <tr>
                {/* Renderiza cabeçalho com cada coluna e controles de edição */}
                {orderedColumnDefs.map((column, idx) => {
                  const col = column.nome;
                  const columnCards = cardsByColumn[String(column.id)] || [];
                  return (
                    <th
                      key={column.id || col}
                      draggable
                      onDragStart={() => handleColumnDragStart(idx)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleColumnDrop(idx)}
                      onDragEnd={handleColumnDragEnd}
                      style={{
                        ...styles.th,
                        minWidth: densityCfg.columnWidth,
                        cursor: "grab",
                        opacity: draggedColumnIndex === idx ? 0.65 : 1,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        {/* Nome da coluna */}
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <GripVertical size={14} /> {col}
                        </span>
                        {/* Contador de cards na coluna */}
                        <span style={{ background: "#f4efff", padding: "2px 8px", borderRadius: "8px", fontSize: "12px", color: "#5f3dc6", border: "1px solid #d6c7ff" }}>
                          {columnCards.length}
                        </span>
                        {/* Botão para editar coluna */}
                        <button 
                          title="Excluir todos os cards da coluna" 
                          disabled={isBulkDeletingCards || columnCards.length === 0}
                          style={{
                            background: "#fff7e8",
                            border: "1px solid #ffe1b0",
                            borderRadius: 6,
                            color: "#9b5a10",
                            cursor: isBulkDeletingCards || columnCards.length === 0 ? "not-allowed" : "pointer",
                            fontSize: 14,
                            padding: "2px 5px",
                            marginLeft: 2,
                            opacity: isBulkDeletingCards || columnCards.length === 0 ? 0.55 : 1,
                          }} 
                          onClick={() => handleDeleteAllCardsInColumn(column)}
                        >
                          <Trash2 size={14} />
                        </button>
                        <button 
                          title="Editar coluna" 
                          style={{ background: "#efe8ff", border: "1px solid #d4c3ff", borderRadius: 6, color: "#6c3bff", cursor: "pointer", fontSize: 14, padding: "2px 5px", marginLeft: 2 }} 
                          onClick={() => openEditColumn(column)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          title="Mover coluna para a esquerda"
                          disabled={idx === 0}
                          style={{ background: "#edf2ff", border: "1px solid #cad7ff", borderRadius: 6, color: "#3a4f97", cursor: idx === 0 ? "not-allowed" : "pointer", fontSize: 14, padding: "2px 5px", marginLeft: 2, opacity: idx === 0 ? 0.55 : 1 }}
                          onClick={() => moveColumn(idx, idx - 1)}
                        >
                          ←
                        </button>
                        <button
                          title="Mover coluna para a direita"
                          disabled={idx === orderedColumnDefs.length - 1}
                          style={{ background: "#edf2ff", border: "1px solid #cad7ff", borderRadius: 6, color: "#3a4f97", cursor: idx === orderedColumnDefs.length - 1 ? "not-allowed" : "pointer", fontSize: 14, padding: "2px 5px", marginLeft: 2, opacity: idx === orderedColumnDefs.length - 1 ? 0.55 : 1 }}
                          onClick={() => moveColumn(idx, idx + 1)}
                        >
                          →
                        </button>
                        {/* Botão para excluir coluna */}
                        <button 
                          title="Excluir coluna" 
                          style={{ background: "#fff1f1", border: "1px solid #ffd2d2", borderRadius: 6, color: "#b33524", cursor: "pointer", fontSize: 14, padding: "2px 5px", marginLeft: 2 }} 
                          onClick={() => handleDeleteColumn(column)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            
            {/* Modal para criar/editar coluna (fora da tabela para melhor posicionamento) */}
            {isColumnModalOpen && (
              <div style={styles.modalOverlay}>
                <div style={styles.modal}>
                  <h2 style={styles.modalTitle}>{columnModalType === "add" ? "Adicionar Coluna" : "Editar Coluna"}</h2>
                  <div style={styles.formGrid}>
                    <input
                      style={styles.modalInput}
                      value={columnName}
                      onChange={e => setColumnName(e.target.value)}
                      placeholder="Nome da coluna"
                      autoFocus
                    />
                  </div>
                  <div style={styles.actionGroup}>
                    <button style={styles.cancelBtn} onClick={() => setIsColumnModalOpen(false)}>Cancelar</button>
                    <button style={styles.saveBtn} onClick={handleSaveColumn}>
                      {columnModalType === "add" ? "Adicionar" : "Salvar"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <tbody>
              <tr>
                {/* Renderiza cada coluna com seus cards */}
                {orderedColumnDefs.map((column) => {
                  const col = column.nome;
                  const columnCards = cardsByColumn[String(column.id)] || [];
                  // Componente interno para manter estado de expansão por coluna
                  function ColumnWithShowMore() {
                    const [expanded, setExpanded] = useState(false);
                    const visible = expanded ? columnCards : columnCards.slice(0, 5);
                    return (
                      <td key={column.id || col} style={{ ...styles.td, minWidth: densityCfg.columnWidth, width: densityCfg.columnWidth }}>
                        <DroppableColumn id={`column-${column.id}`} minHeight={densityCfg.columnMinHeight} padding={densityCfg.columnPadding}>
                          {visible.map((card) => (
                            <DraggableCard
                              key={getCardKey(card)}
                              card={card}
                              onOpen={handleOpenCard}
                              densityCfg={densityCfg}
                              isPromoted={promotedCardId === getCardKey(card)}
                              isTargeted={targetedCardId === String(getCardKey(card))}
                              domId={getCardDomId(getCardKey(card))}
                            />
                          ))}
                          {columnCards.length > 5 && !expanded && (
                            <button
                              style={{
                                margin: '12px auto 0',
                                display: 'block',
                                background: '#ede6ff',
                                border: 'none',
                                color: '#5b3ad1',
                                fontSize: '13px',
                                fontWeight: 600,
                                borderRadius: 8,
                                padding: '8px 18px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(90,48,255,0.08)',
                              }}
                              onClick={() => setExpanded(true)}
                            >
                              Ver mais
                            </button>
                          )}
                          {columnCards.length > 5 && expanded && (
                            <button
                              style={{
                                margin: '12px auto 0',
                                display: 'block',
                                background: '#f7f4ff',
                                border: 'none',
                                color: '#7c5cff',
                                fontSize: '13px',
                                fontWeight: 600,
                                borderRadius: 8,
                                padding: '8px 18px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(90,48,255,0.08)',
                              }}
                              onClick={() => setExpanded(false)}
                            >
                              Mostrar menos
                            </button>
                          )}
                          {columnCards.length === 0 && (
                            <div style={{ textAlign: "center", padding: "42px 16px", color: "#8a79c2", fontSize: "13px" }}>
                              Nenhum card
                            </div>
                          )}
                        </DroppableColumn>
                      </td>
                    );
                  }
                  return <ColumnWithShowMore key={column.id || col} />;
                })}
              </tr>
            </tbody>
          </table>
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div style={{ width: densityCfg.columnWidth, pointerEvents: "none" }}>
              <DraggableCard card={activeCard} onOpen={() => {}} densityCfg={densityCfg} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de criação de card */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.createModal}>
            <div style={styles.createHero}>
              <div style={styles.createHeroTitleWrap}>
                <h2 style={styles.createHeroTitle}>
                  <Plus size={20} /> Criar novo card
                </h2>
                <p style={styles.createHeroText}>
                  Monte a solicitação com o mesmo padrão visual do Bitrix: dados principais primeiro, contexto operacional em seguida e um fechamento claro para a equipe.
                </p>
                <div style={styles.createHeroBadgeRow}>
                  <span style={styles.createHeroBadge}><Wrench size={13} /> Fluxo comercial</span>
                  <span style={styles.createHeroBadge}><Zap size={13} /> Entrada rápida</span>
                  <span style={styles.createHeroBadge}><CalendarDays size={13} /> Pronto para operação</span>
                </div>
              </div>

              <div style={styles.createHeroSide}>
                <div style={styles.createMetaCard}>
                  <p style={styles.createMetaLabel}>Responsável</p>
                  <p style={styles.createMetaValue}>{selectedVendorOption?.label || seller}</p>
                </div>
                <div style={styles.createMetaCard}>
                  <p style={styles.createMetaLabel}>Etapa inicial</p>
                  <select
                    style={{
                      ...styles.createInput,
                      fontWeight: 700,
                      color: '#5a30ff',
                      background: '#f7f5ff',
                      border: '1px solid #d6d0ff',
                      cursor: 'pointer',
                      marginTop: 2,
                      minWidth: 120,
                    }}
                    value={newCard.colunaId || orderedColumnDefs[0]?.id || ''}
                    onChange={e => {
                      setNewCard((prev) => ({ ...prev, colunaId: Number(e.target.value) }));
                    }}
                  >
                    {orderedColumnDefs.map(col => (
                      <option key={col.id} value={col.id}>{col.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={styles.createBody}>
              <div style={styles.createSection}>
                <div style={styles.createSectionHeader}>
                  <h3 style={styles.createSectionTitle}><User size={16} /> Informações principais</h3>
                  <span style={styles.createSectionChip}>Principal</span>
                </div>
                <div style={styles.createSectionGrid}>
                  <div style={styles.createField}>
                    <label style={styles.createLabel}><FileText size={13} /> Título do card</label>
                    <input
                      style={styles.createInput}
                      value={newCard.titulo}
                      onChange={(e) => handleInputChange("titulo", e.target.value)}
                      onFocus={handleCreateFieldFocus}
                      onBlur={handleCreateFieldBlur}
                      placeholder="Ex: Instalação de internet empresarial"
                    />
                  </div>

                  <div style={styles.createRow}>
                    <div style={styles.createField}>
                      <label style={styles.createLabel}><User size={13} /> Cliente <span style={styles.createRequired}>*</span></label>
                      <input
                        style={styles.createInput}
                        value={newCard.cliente}
                        onChange={(e) => handleInputChange("cliente", e.target.value)}
                        onFocus={handleCreateFieldFocus}
                        onBlur={handleCreateFieldBlur}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div style={styles.createField}>
                      <label style={styles.createLabel}><Phone size={13} /> Telefone <span style={styles.createRequired}>*</span></label>
                      <input
                        style={styles.createInput}
                        value={newCard.telefone}
                        onChange={(e) => handleInputChange("telefone", e.target.value)}
                        onFocus={handleCreateFieldFocus}
                        onBlur={handleCreateFieldBlur}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>

                  <div style={styles.createField}>
                    <label style={styles.createLabel}><MapPin size={13} /> Endereço <span style={styles.createRequired}>*</span></label>
                    <input
                      style={styles.createInput}
                      value={newCard.endereco}
                      onChange={(e) => handleInputChange("endereco", e.target.value)}
                      onFocus={handleCreateFieldFocus}
                      onBlur={handleCreateFieldBlur}
                      placeholder="Rua, número, bairro, cidade"
                    />
                  </div>
                </div>
              </div>

              <div style={styles.createSection}>
                  <div style={styles.createSectionHeader}>
                    <h3 style={styles.createSectionTitle}><Wrench size={16} /> Escopo e valores</h3>
                    <span style={styles.createSectionChip}>Operação</span>
                  </div>
                  <div style={styles.createSectionGrid}>
                    <div style={styles.createRow}>
                      <div style={styles.createField}>
                        <label style={styles.createLabel}><Wrench size={13} /> Tipo de serviço <span style={styles.createRequired}>*</span></label>
                        <input
                          style={styles.createInput}
                          value={newCard.tipoServico}
                          onChange={(e) => handleInputChange("tipoServico", e.target.value)}
                          onFocus={handleCreateFieldFocus}
                          onBlur={handleCreateFieldBlur}
                          placeholder="Instalação, manutenção, visita técnica"
                        />
                      </div>
                      <div style={styles.createField}>
                        <label style={styles.createLabel}>Tipo do Card <span style={styles.createRequired}>*</span></label>
                        <select
                          style={styles.createInput}
                          value={newCard.tipo_card}
                          onChange={(e) => handleInputChange("tipo_card", e.target.value)}
                          onFocus={handleCreateFieldFocus}
                          onBlur={handleCreateFieldBlur}
                          required
                        >
                          <option value="">Selecione...</option>
                          <option value="Venda">Venda</option>
                          <option value="Cotação">Cotação</option>
                          <option value="POC">POC</option>
                        </select>
                      </div>
                      <div style={styles.createField}>
                        <label style={styles.createLabel}><DollarSign size={13} /> Mensalidade (R$)</label>
                        <input
                          style={styles.createInput}
                          type="number"
                          step="0.01"
                          value={newCard.mensalidade}
                          onChange={(e) => handleInputChange("mensalidade", e.target.value)}
                          onFocus={handleCreateFieldFocus}
                          onBlur={handleCreateFieldBlur}
                          placeholder="0,00"
                        />
                      </div>
                      <div style={styles.createField}>
                        <label style={styles.createLabel}><DollarSign size={13} /> Instalação (R$)</label>
                        <input
                          style={styles.createInput}
                          type="number"
                          step="0.01"
                          value={newCard.instalacao}
                          onChange={(e) => handleInputChange("instalacao", e.target.value)}
                          onFocus={handleCreateFieldFocus}
                          onBlur={handleCreateFieldBlur}
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                  <div style={styles.createRow}>
                    <div style={styles.createField}>
                      <label style={styles.createLabel}><Zap size={13} /> SLA (horas)</label>
                      <input
                        style={styles.createInput}
                        type="number"
                        value={newCard.sla}
                        onChange={(e) => handleInputChange("sla", e.target.value)}
                        onFocus={handleCreateFieldFocus}
                        onBlur={handleCreateFieldBlur}
                        placeholder="0"
                      />
                    </div>
                    <div style={styles.createField}>
                      <label style={styles.createLabel}><CalendarDays size={13} /> Prazo</label>
                      <input
                        style={styles.createInput}
                        type="date"
                        value={newCard.prazo}
                        onChange={(e) => handleInputChange("prazo", e.target.value)}
                        onFocus={handleCreateFieldFocus}
                        onBlur={handleCreateFieldBlur}
                      />
                    </div>
                    <div style={styles.createField}>
                      <label style={styles.createLabel}><FileText size={13} /> Tempo Contratual</label>
                      <input
                        style={styles.createInput}
                        type="text"
                        value={newCard.tempoContratual}
                        onChange={e => handleInputChange('tempoContratual', e.target.value)}
                        placeholder="Ex: 12 meses, 24 meses, etc."
                      />
                    </div>
                  </div>

                  <div style={styles.createField}>
                    <label style={styles.createLabel}><User size={13} /> Vendedor responsável</label>
                    <div style={{ marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#2f3a56" }}>Selecionado:</span>
                      <span style={{ ...getProfileBadgeStyle(selectedVendorOption?.perfil), borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                        {selectedVendorOption?.label || `${seller} (atual)`}
                      </span>
                    </div>
                    <input
                      style={{ ...styles.createInput, marginBottom: 8 }}
                      value={vendorSearchCreate}
                      onChange={(e) => setVendorSearchCreate(e.target.value)}
                      onFocus={handleCreateFieldFocus}
                      onBlur={handleCreateFieldBlur}
                      placeholder="Buscar vendedor..."
                    />
                    <select
                      style={styles.createInput}
                      value={newCard.vendedorId || ""}
                      onChange={(e) => handleInputChange("vendedorId", e.target.value)}
                      onFocus={handleCreateFieldFocus}
                      onBlur={handleCreateFieldBlur}
                    >
                      <option value="">{seller} (usuário atual)</option>
                      {filteredCreateVendors.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}{option.perfil ? ` - ${option.perfil}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={styles.createSection}>
                <div style={styles.createSectionHeader}>
                  <h3 style={styles.createSectionTitle}><MapPin size={16} /> Localização e contexto</h3>
                  <span style={styles.createSectionChip}>Detalhes</span>
                </div>
                <div style={styles.createSectionGrid}>
                  <div style={styles.createRow}>
                    <div style={styles.createField}>
                      <label style={styles.createLabel}><MapPin size={13} /> Latitude</label>
                      <input
                        style={styles.createInput}
                        type="text"
                        value={newCard.coordenadas.lat}
                        onChange={(e) => handleInputChange("lat", e.target.value)}
                        onFocus={handleCreateFieldFocus}
                        onBlur={handleCreateFieldBlur}
                        placeholder="-23.550520"
                      />
                    </div>
                    <div style={styles.createField}>
                      <label style={styles.createLabel}><MapPin size={13} /> Longitude</label>
                      <input
                        style={styles.createInput}
                        type="text"
                        value={newCard.coordenadas.lng}
                        onChange={(e) => handleInputChange("lng", e.target.value)}
                        onFocus={handleCreateFieldFocus}
                        onBlur={handleCreateFieldBlur}
                        placeholder="-46.633308"
                      />
                    </div>
                  </div>

                  <div style={styles.createField}>
                    <label style={styles.createLabel}><FileText size={13} /> Observações</label>
                    <textarea
                      style={styles.createTextArea}
                      value={newCard.observacoes}
                      onChange={(e) => handleInputChange("observacoes", e.target.value)}
                      onFocus={handleCreateFieldFocus}
                      onBlur={handleCreateFieldBlur}
                      placeholder="Contexto da visita, acesso ao local, restrições técnicas ou observações comerciais"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </div>

            {error && <p style={styles.errorText}>{error}</p>}
            {!error && <p style={styles.createFooterNote}>Os campos marcados com * são obrigatórios para abrir o card no fluxo.</p>}

            <div style={styles.actionGroup}>
              <button style={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button 
                style={styles.saveBtn} 
                onClick={handleCreateCard}
                disabled={isCreating}
              >
                {isCreating ? "Criando..." : "Salvar card"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de importação de cards */}
      {isImportModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: "720px" }}>
            <h2 style={styles.modalTitle}><FileUp size={18} style={{ marginRight: 8, verticalAlign: "text-bottom" }} />Importar cards</h2>

            <div style={{ ...styles.formGrid, gap: 10 }}>
              <p style={{ margin: 0, color: "#5f5a88", fontSize: 13 }}>
                Aceita JSON em array de cards ou export do Trello (com cards/lists).
              </p>

              <div style={{ border: "1px solid #d8cffb", borderRadius: 10, padding: 10, background: "#f8f6ff" }}>
                <strong style={{ display: "block", color: "#3f3292", fontSize: 13, marginBottom: 8 }}>Importar direto do Trello</strong>
                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    style={styles.modalInput}
                    value={trelloBoardRef}
                    onChange={(e) => setTrelloBoardRef(e.target.value)}
                    placeholder="Board ID ou URL do Trello"
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input
                      style={styles.modalInput}
                      value={trelloKey}
                      onChange={(e) => setTrelloKey(e.target.value)}
                      placeholder="Trello Key"
                    />
                    <input
                      style={styles.modalInput}
                      value={trelloToken}
                      onChange={(e) => setTrelloToken(e.target.value)}
                      placeholder="Trello Token"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleImportFromTrello}
                    disabled={isImportingTrello}
                    style={{ ...styles.saveBtn, justifySelf: "start" }}
                  >
                    {isImportingTrello ? "Importando do Trello..." : "Trazer cards do Trello"}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10 }}>
                <label style={{ ...styles.cancelBtn, textAlign: "center", cursor: "pointer" }}>
                  Selecionar arquivo JSON
                  <input type="file" accept="application/json,.json" onChange={handleLoadImportFile} style={{ display: "none" }} />
                </label>

                <select
                  style={styles.modalInput}
                  value={importDefaultStatus}
                  onChange={(e) => setImportDefaultStatus(e.target.value)}
                >
                  {columns.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <textarea
                style={{ ...styles.modalTextArea, minHeight: 220 }}
                value={importRaw}
                onChange={(e) => setImportRaw(e.target.value)}
                placeholder="Cole aqui o JSON exportado do Trello ou de outra ferramenta..."
              />

              {importSummary && (
                <p style={{ margin: 0, color: "#2e7d32", fontSize: 13, fontWeight: 600 }}>{importSummary}</p>
              )}

              {externalExportSummary && (
                <p style={{ margin: 0, color: "#1565c0", fontSize: 13, fontWeight: 600 }}>{externalExportSummary}</p>
              )}
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.actionGroup}>
              <button
                style={styles.cancelBtn}
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportSummary("");
                  setExternalExportSummary("");
                }}
              >
                Fechar
              </button>
              <button
                style={{ ...styles.cancelBtn, background: "#eef5ff", color: "#21468a", borderColor: "#c8dbff" }}
                onClick={handleExportExternalCsv}
              >
                Exportar JSON em CSV
              </button>
              <button
                style={{ ...styles.cancelBtn, background: "#eefbf1", color: "#1f5b2e", borderColor: "#c6e9cf" }}
                onClick={handleExportExternalExcel}
              >
                Exportar JSON em Excel
              </button>
              <button
                style={styles.saveBtn}
                onClick={handleImportCards}
                disabled={isImporting}
              >
                {isImporting ? "Importando..." : "Importar cards"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalhes do card - exibe todas as informações e comentários */}
      {selectedCard && (
        <div style={styles.modalOverlay}>
          <div style={styles.detailsModalCard}>
            {/* Cabeçalho do modal */}
            <div style={styles.detailsHeader}>
              <h2 style={styles.detailsTitle}>
                <ClipboardList size={19} />
                {selectedCard.titulo || selectedCard.cliente || "Detalhes do card"}
              </h2>
              <button onClick={handleCloseCard} style={styles.detailsCloseBtn} title="Fechar">x</button>
            </div>
            <div style={styles.detailsContent}>
              <div style={styles.detailsMain}>
                <div style={styles.detailsMainBody}>
                {/* Seção de informações principais do card */}
                <div style={styles.detailsSection}>
              <div style={styles.detailsRow}>
                <span style={styles.detailsLabel}><User size={14} /> Cliente:</span> 
                <span style={styles.detailsValue}>{selectedCard.cliente}</span>
              </div>
              {/* Exibe o tipo do card (Venda, Cotação, POC) */}
              {selectedCard.tipo_card && (
                <div style={styles.detailsRow}>
                  <span style={styles.detailsLabel}>Tipo do Card:</span>
                  <span style={{
                    ...styles.detailsValue,
                    background: '#e7e3ff',
                    color: '#5a30ff',
                    fontWeight: 700,
                    fontSize: 13,
                    borderRadius: 10,
                    padding: '2px 14px',
                    marginLeft: 8,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    border: '1px solid #cfc2ff',
                    display: 'inline-block',
                  }}>{selectedCard.tipo_card}</span>
                </div>
              )}
              <div style={styles.detailsRow}>
                <span style={styles.detailsLabel}>Telefone:</span> 
                <span style={styles.detailsValue}>{selectedCard.telefone}</span>
              </div>
              <div style={styles.detailsRow}>
                <span style={styles.detailsLabel}><MapPin size={14} /> Endereço:</span> 
                <span style={styles.detailsValue}>{selectedCard.endereco}</span>
              </div>
              <div style={styles.detailsRow}>
                <span style={styles.detailsLabel}><Wrench size={14} /> Serviço:</span> 
                <span style={styles.detailsValue}>{selectedCard.tipoServico}</span>
              </div>
              <div style={styles.detailsRow}>
                <span style={styles.detailsLabel}><DollarSign size={14} /> Mensalidade:</span> 
                <span style={styles.detailsValue}>
                  {selectedCard.mensalidade ? Number(selectedCard.mensalidade).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "--"}
                </span>
              </div>
              <div style={styles.detailsRow}>
                <span style={styles.detailsLabel}><DollarSign size={14} /> Instalação:</span> 
                <span style={styles.detailsValue}>
                  {selectedCard.instalacao ? Number(selectedCard.instalacao).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "--"}
                </span>
              </div>
              <div style={styles.detailsRow}>
                <span style={styles.detailsLabel}>⏱️ SLA:</span> 
                <span style={styles.detailsValue}>{selectedCard.sla || "--"} horas</span>
              </div>
              <div style={styles.detailsRow}>
                <span style={styles.detailsLabel}><FileText size={14} /> Tempo Contratual:</span>
                <span style={styles.detailsValue}>
                  {selectedCard.tempoContratual ? `${selectedCard.tempoContratual} meses` : "--"}
                </span>
              </div>
              <div style={styles.detailsRow}>
                <span style={styles.detailsLabel}><CalendarDays size={14} /> Prazo:</span> 
                <span style={styles.detailsValue}>
                  {selectedCard.prazo ? new Date(selectedCard.prazo).toLocaleDateString("pt-BR") : "--"}
                </span>
              </div>
              
              {/* Seletor de status com atualização inline */}
              <div style={styles.detailsStatusRow}>
                <span style={styles.detailsLabel}><Zap size={14} /> Status:</span>
                <select 
                  value={statusEdit} 
                  onChange={(e) => setStatusEdit(e.target.value)} 
                  style={styles.modalInput}
                >
                  {orderedColumnDefs.map((column) => (
                    <option key={column.id} value={String(column.id)}>{column.nome}</option>
                  ))}
                </select>
                <button onClick={() => handleChangeStatus(statusEdit)} style={styles.saveBtn}>
                  Atualizar
                </button>
              </div>

              <div style={styles.detailsStatusRow}>
                <span style={styles.detailsLabel}><User size={14} /> Vendedor:</span>
                <span style={{ ...getProfileBadgeStyle(currentDetailVendor?.perfil), borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "normal" }}>
                  Atual: {selectedCard?.vendedor?.nome || selectedCard?.vendedor || selectedCard?.vendedorId || "Sem vendedor"}
                </span>
                <input
                  value={vendorSearchDetails}
                  onChange={(e) => setVendorSearchDetails(e.target.value)}
                  style={{ ...styles.modalInput, minWidth: 180 }}
                  placeholder="Buscar..."
                />
                <select
                  value={vendorEdit}
                  onChange={(e) => setVendorEdit(e.target.value)}
                  style={styles.modalInput}
                >
                  <option value="">Selecione</option>
                  {filteredDetailVendors.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
                <span style={{ ...getProfileBadgeStyle(selectedDetailVendor?.perfil), borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "normal" }}>
                  Selecionado: {selectedDetailVendor?.label || "-"}
                </span>
                <button onClick={handleChangeVendor} style={styles.saveBtn}>
                  Atualizar vendedor
                </button>
              </div>
            </div>
            
            {/* Exibe observações se houver */}
            {selectedCard.observacoes && (
              <div style={styles.detailsObservacoes}>
                <span style={{ fontWeight: 600, color: '#7c6fb7', marginRight: 6 }}>Observações:</span>
                {selectedCard.observacoes}
              </div>
            )}
                </div>

            {/* Botões de ação do card */}
            <div style={styles.detailsActions}>
              <button 
                onClick={() => { 
                  setEditingCard(selectedCard); 
                  setIsEditCardOpen(true); 
                  setSelectedCard(null); 
                }} 
                style={{ ...styles.cancelBtn, background: "#e3f2fd", color: "#1565c0" }}
              >
                <Pencil size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Editar
              </button>
              <button onClick={handleSaveCardChanges} style={styles.cancelBtn}>
                Salvar alterações
              </button>
              <button onClick={handleDuplicateCard} style={{ ...styles.cancelBtn, background: "#ebf2ff", color: "#1f4baf" }}>
                Duplicar
              </button>
              <button onClick={handleDeleteCard} style={{ ...styles.cancelBtn, background: "#ffe9e4", color: "#b33524" }}>
                Excluir
              </button>
            </div>
            </div>
            
            {/* Seção de comentários */}
            <div style={styles.detailsComments}>
              <div style={styles.detailsCommentsHeader}>
                <h3 style={{ margin: 0, color: '#4b3b9a', fontSize: '18px' }}>
                  <MessageCircle size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Comentários
                </h3>
                <span style={{ color: '#6f5db1', fontSize: '12px', fontWeight: 600 }}>
                  {(selectedCard.comments || []).length} itens
                </span>
              </div>

              <div style={styles.detailsCommentsList}>
                {/* Lista de comentários existentes */}
                {(selectedCard.comments || []).length === 0 ? (
                  <p style={{ color: '#766fa5', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                    Nenhum comentário ainda.
                  </p>
                ) : (
                  [...(selectedCard.comments || [])].reverse().map((comment, idx) => (
                    <div key={comment.id} style={styles.detailsCommentItem}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {comment.authorAvatar ? (
                            <img
                              src={comment.authorAvatar}
                              alt={comment.author || 'Usuário'}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: '1px solid #d9cdfd',
                                boxShadow: '0 2px 6px rgba(92, 58, 170, 0.22)',
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #8f6bff, #5b3fc9)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                                border: '1px solid #d9cdfd',
                                boxShadow: '0 2px 6px rgba(92, 58, 170, 0.22)',
                              }}
                            >
                              {getAvatarInitials(comment.author || 'Usuário')}
                            </div>
                          )}
                          <p style={styles.detailsCommentAuthor}>{comment.author || 'Usuário'}:</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={{ background: 'none', border: 'none', color: '#b33524', fontSize: 16, cursor: 'pointer' }} title="Excluir comentário" onClick={async () => {
                            const updatedComments = (selectedCard.comments || []).filter((_, i) => i !== idx);
                            try {
                              await persistCommentsOnSelectedCard(updatedComments);
                            } catch (err) {
                              setError("Erro ao excluir comentário");
                            }
                          }}><Trash2 size={15} /></button>
                          <button style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 16, cursor: 'pointer' }} title="Editar comentário" onClick={() => {
                            setIsCommentComposerOpen(true);
                            setCommentText(comment.text);
                            const updatedComments = (selectedCard.comments || []).filter((_, i) => i !== idx);
                            const cardUpdate = { ...selectedCard, comments: updatedComments };
                            api.put(`/cards/${getCardKey(selectedCard)}`, cardUpdate).then((response) => {
                              const updatedCard = response.data;
                              promoteUpdatedCardToTop(updatedCard);
                              setSelectedCard(updatedCard);
                            });
                          }}><Pencil size={15} /></button>
                        </div>
                      </div>
                      <div style={styles.detailsCommentText}>{renderCommentMarkdownWithMentions(comment.text, mentionProfileLookup)}</div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['👍', '❤️', '😂', '😮', '👏'].map((emoji) => {
                          const users = Array.isArray(comment?.reactions?.[emoji]) ? comment.reactions[emoji] : [];
                          const meReactionKey = getReactionUserKey(userData?.nome || userData?.username || userData?.email || `user-${sellerId || "anon"}`);
                          const uniqueUsers = Array.from(
                            users.reduce((map, name) => {
                              const key = getReactionUserKey(name);
                              if (!key || map.has(key)) return map;
                              map.set(key, getReactionUserDisplayName(name));
                              return map;
                            }, new Map())
                          ).map((entry) => entry[1]);
                          const count = uniqueUsers.length;
                          const reactedByMe = users.some((name) => getReactionUserKey(name) === meReactionKey);
                          const reactionKey = `${comment.id}-${emoji}`;
                          const isHoveredReaction = hoveredReactionKey === reactionKey;
                          const visibleUsers = uniqueUsers.slice(0, 6);
                          const hasMoreUsers = uniqueUsers.length > visibleUsers.length;

                          return (
                            <div
                              key={reactionKey}
                              style={{ position: 'relative', display: 'inline-flex' }}
                              onMouseEnter={() => setHoveredReactionKey(reactionKey)}
                              onMouseLeave={() => setHoveredReactionKey((current) => (current === reactionKey ? null : current))}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleReaction(comment.id, emoji)}
                                style={{
                                  border: reactedByMe ? '1px solid #8f7cff' : '1px solid #e1d8ff',
                                  background: reactedByMe ? '#efe9ff' : '#fff',
                                  color: '#4b3b9a',
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: '3px 8px',
                                }}
                              >
                                {emoji}{count > 0 ? ` ${count}` : ''}
                              </button>

                              {count > 0 && isHoveredReaction && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: 'calc(100% + 8px)',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: '#ffffff',
                                    border: '1px solid #e3d9ff',
                                    boxShadow: '0 8px 22px rgba(75, 59, 154, 0.2)',
                                    borderRadius: 10,
                                    padding: '7px 9px',
                                    minWidth: 150,
                                    maxWidth: 220,
                                    zIndex: 25,
                                    pointerEvents: 'none',
                                  }}
                                >
                                  <div style={{ color: '#4b3b9a', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                                    Reagiram {emoji}
                                  </div>
                                  {visibleUsers.map((name, index) => (
                                    <div
                                      key={`${reactionKey}-user-${index}`}
                                      style={{ color: '#6558a0', fontSize: 11, lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                      title={String(name || 'Usuário')}
                                    >
                                      {String(name || 'Usuário')}
                                    </div>
                                  ))}
                                  {hasMoreUsers && (
                                    <div style={{ color: '#7f74b4', fontSize: 10, marginTop: 2 }}>
                                      +{uniqueUsers.length - visibleUsers.length} mais
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => setActiveReplyCommentId((prev) => (String(prev) === String(comment.id) ? null : comment.id))}
                          style={{
                            border: '1px solid #d8cdfd',
                            background: '#fff',
                            color: '#4b3b9a',
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '3px 10px',
                          }}
                        >
                          Responder
                        </button>
                      </div>

                      {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                        <div style={{ marginTop: 10, paddingLeft: 14, borderLeft: '2px solid #e1d8ff', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[...comment.replies]
                            .sort((a, b) => {
                              const aTime = new Date(a?.createdAt || 0).getTime();
                              const bTime = new Date(b?.createdAt || 0).getTime();
                              return bTime - aTime;
                            })
                            .map((reply) => {
                              const replyEditKey = getReplyEditKey(comment.id, reply.id);
                              const isEditingThisReply = editingReplyKey === replyEditKey;

                              return (
                                <div key={reply.id} style={{ background: '#faf8ff', border: '1px solid #ece6ff', borderRadius: 10, padding: '8px 10px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                    <div style={{ fontSize: 12, color: '#5c4ca8', fontWeight: 700 }}>{reply.author || 'Usuário'}</div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button
                                        type="button"
                                        title="Editar resposta"
                                        onClick={() => handleStartEditReply(comment.id, reply)}
                                        style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 16, cursor: 'pointer' }}
                                      >
                                        <Pencil size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        title="Excluir resposta"
                                        onClick={() => handleDeleteReply(comment.id, reply.id)}
                                        style={{ background: 'none', border: 'none', color: '#b33524', fontSize: 16, cursor: 'pointer' }}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>

                                  {isEditingThisReply ? (
                                    <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                                      <input
                                        type="text"
                                        value={editingReplyText}
                                        onChange={(e) => setEditingReplyText(e.target.value)}
                                        placeholder="Edite a resposta..."
                                        style={{
                                          flex: 1,
                                          border: '1px solid #d8cdfd',
                                          background: '#fff',
                                          color: '#3f3292',
                                          borderRadius: 8,
                                          fontSize: 12,
                                          padding: '7px 9px',
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEditReply(comment.id, reply.id)}
                                        style={{
                                          border: 'none',
                                          background: '#6f57e8',
                                          color: '#fff',
                                          borderRadius: 8,
                                          fontSize: 12,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          padding: '7px 9px',
                                        }}
                                      >
                                        Salvar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleCancelEditReply}
                                        style={{
                                          border: '1px solid #d8cdfd',
                                          background: '#fff',
                                          color: '#4b3b9a',
                                          borderRadius: 8,
                                          fontSize: 12,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          padding: '7px 9px',
                                        }}
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 13, color: '#4f3dab', marginTop: 2 }}>{renderCommentMarkdownWithMentions(reply.text, mentionProfileLookup)}</div>
                                  )}

                                  <small style={{ color: '#8d83b3', fontSize: 10 }}>
                                    {reply.createdAt ? new Date(reply.createdAt).toLocaleString('pt-BR') : ''}
                                    {reply.editedAt ? ' (editado)' : ''}
                                  </small>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {String(activeReplyCommentId) === String(comment.id) && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            value={replyDraftByCommentId?.[comment.id] || ''}
                            onChange={(e) => setReplyDraftByCommentId((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                            placeholder="Escreva uma resposta..."
                            style={{
                              flex: 1,
                              border: '1px solid #d8cdfd',
                              background: '#fff',
                              color: '#3f3292',
                              borderRadius: 8,
                              fontSize: 12,
                              padding: '8px 10px',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddReply(comment.id)}
                            style={{
                              border: 'none',
                              background: '#6f57e8',
                              color: '#fff',
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '8px 10px',
                            }}
                          >
                            Enviar
                          </button>
                        </div>
                      )}

                      {comment.attachment && (
                        <div style={{ marginTop: 8 }}>
                          {comment.attachment.type && comment.attachment.type.startsWith('image/') ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewImage({ src: comment.attachment.data, name: comment.attachment.name || 'Imagem anexada' });
                                setPreviewZoom(1);
                              }}
                              style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'zoom-in' }}
                              title="Clique para ampliar"
                            >
                              <img
                                src={comment.attachment.data}
                                alt={comment.attachment.name || 'Imagem anexada'}
                                style={{ maxWidth: 320, maxHeight: 220, borderRadius: 8, border: '1px solid #e0e0e0', display: 'block', marginBottom: 6 }}
                              />
                            </button>
                          ) : comment.attachment.type === 'application/pdf' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#b71c1c', fontWeight: 700, fontSize: 14 }}>
                                <FileText size={18} /> PDF
                              </span>
                              <a href={comment.attachment.data} target="_blank" rel="noopener noreferrer" style={{ color: '#4b3b9a', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}>Abrir</a>
                              <a href={comment.attachment.data} download={comment.attachment.name || 'arquivo.pdf'} style={{ color: '#4b3b9a', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}>Baixar</a>
                              <button
                                type="button"
                                onClick={() => {
                                  const printableWindow = window.open(comment.attachment.data, '_blank', 'noopener,noreferrer');
                                  if (printableWindow) {
                                    setTimeout(() => printableWindow.print(), 600);
                                  }
                                }}
                                style={{ border: 'none', background: 'transparent', color: '#4b3b9a', fontWeight: 600, fontSize: 13, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                              >
                                Imprimir
                              </button>
                            </div>
                          ) : (
                            <a href={comment.attachment.data} download={comment.attachment.name} style={{ color: '#6c3bff', textDecoration: 'underline', fontSize: 13, maxWidth: 180, display: 'inline-flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                              <Paperclip size={13} style={{ marginRight: 4, verticalAlign: "text-bottom" }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: 120 }}>
                                {comment.attachment.name}
                              </span>
                            </a>
                          )}
                        </div>
                      )}
                      <small style={styles.detailsCommentDate}>
                        {new Date(comment.createdAt).toLocaleString('pt-BR')}
                      </small>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.detailsComposer}>
                {!isCommentComposerOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsCommentComposerOpen(true)}
                    style={{
                      border: "1px solid #d8cdfd",
                      background: "#ffffff",
                      color: "#4b3b9a",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <MessageCircle size={14} />
                    Escreva um comentário
                  </button>
                ) : (
                  <>
                    <CommentInput
                      value={commentText}
                      onChange={setCommentText}
                      onSend={handleAddComment}
                      mentionUsers={mentionUsers}
                      onFile={handleAttachmentSelect}
                      pendingAttachment={pendingAttachment}
                      onClearAttachment={() => setPendingAttachment(null)}
                      placeholder="Escreva um comentário, use @ para menção, ou anexe arquivos/fotos..."
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCommentComposerOpen(false);
                          setCommentText("");
                          setPendingAttachment(null);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#6f5db1",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Fechar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(22, 11, 53, 0.72)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 4200,
            padding: 20,
          }}
          onClick={() => {
            setPreviewImage(null);
            setPreviewZoom(1);
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '88vh',
            }}
            onClick={(event) => event.stopPropagation()}
            onWheel={(event) => {
              event.preventDefault();
              const delta = event.deltaY > 0 ? -0.1 : 0.1;
              setPreviewZoom((prev) => Math.min(3, Math.max(0.6, Number((prev + delta).toFixed(2)))));
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -12,
                left: -12,
                display: 'flex',
                gap: 6,
                zIndex: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewZoom((prev) => Math.min(3, Number((prev + 0.2).toFixed(2))))}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#ffffff',
                  color: '#3d2f91',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(33, 17, 88, 0.3)',
                }}
                title="Aumentar zoom"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom((prev) => Math.max(0.6, Number((prev - 0.2).toFixed(2))))}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#ffffff',
                  color: '#3d2f91',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(33, 17, 88, 0.3)',
                }}
                title="Diminuir zoom"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom(1)}
                style={{
                  height: 30,
                  borderRadius: 999,
                  border: 'none',
                  background: '#ffffff',
                  color: '#3d2f91',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(33, 17, 88, 0.3)',
                  padding: '0 10px',
                  fontSize: 11,
                }}
                title="Resetar zoom"
              >
                {Math.round(previewZoom * 100)}%
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setPreviewImage(null);
                setPreviewZoom(1);
              }}
              style={{
                position: 'absolute',
                top: -12,
                right: -12,
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: 'none',
                background: '#ffffff',
                color: '#3d2f91',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(33, 17, 88, 0.3)',
              }}
              title="Fechar"
            >
              ×
            </button>
            <img
              src={previewImage.src}
              alt={previewImage.name || 'Imagem anexada'}
              style={{
                display: 'block',
                maxWidth: '92vw',
                maxHeight: '88vh',
                borderRadius: 12,
                boxShadow: '0 18px 40px rgba(14, 6, 38, 0.45)',
                border: '1px solid rgba(233, 228, 255, 0.45)',
                transform: `scale(${previewZoom})`,
                transformOrigin: 'center center',
                transition: 'transform 120ms ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de edição de card - usa componente CardModal para formulário completo */}
      {isEditCardOpen && editingCard && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: "700px", maxHeight: "85vh", overflowY: "auto" }}>
            {/* Cabeçalho do modal de edição */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, color: "#4c3393", fontSize: "22px" }}><Pencil size={18} style={{ marginRight: 8, verticalAlign: "text-bottom" }} />Editar Card</h2>
              <button 
                onClick={() => { setIsEditCardOpen(false); setEditingCard(null); }} 
                style={{ border: "none", background: "transparent", fontSize: "24px", cursor: "pointer", color: "#7f6ad7", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#ff4444"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#7f6ad7"}
              >
                x
              </button>
            </div>
            
            {/* Componente CardModal reutilizável para edição */}
            <CardModal 
              card={editingCard} 
              vendorOptions={vendorOptions}
              onSave={async (updatedCard) => {
                try {
                  // Envia atualização para API remapeando vendedorId → vendedor_id
                  const payload = { ...updatedCard };
                  if (payload.vendedorId !== undefined && payload.vendedorId !== "") {
                    payload.vendedor_id = Number(payload.vendedorId);
                  }
                  delete payload.vendedorId;
                  const response = await api.put(`/cards/${getCardKey(editingCard)}`, payload);
                  const savedCard = response.data;
                  
                  // Atualiza estado dos cards
                  setCards((prev) => prev.map((c) => getCardKey(c) === getCardKey(savedCard) ? savedCard : c));
                  
                  // Se o card editado está selecionado, atualiza também
                  if (selectedCard && getCardKey(selectedCard) === getCardKey(savedCard)) {
                    setSelectedCard(savedCard);
                    setStatusEdit(String(getCardColumnId(savedCard) || ""));
                  }
                  
                  // Fecha modal de edição
                  setIsEditCardOpen(false);
                  setEditingCard(null);
                } catch (error) {
                  console.error("Erro ao salvar card:", error);
                  alert("Erro ao salvar as alterações. Tente novamente.");
                }
              }}
              onClose={() => { 
                setIsEditCardOpen(false); 
                setEditingCard(null); 
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

