import { useEffect, useState } from "react";
import api from "../../services/api";
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
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
  Plus,
  Trash2,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import CardModal from "../Modal/CardModal";
import CommentInput from "./CommentInput";

const KANBAN_PREFS_KEY = "kanbanPrefs";
const DEFAULT_COLUMNS = [
  "Novo",
  "Em análise",
  "Agendamento",
  "Agendado",
  "Em execução",
  "Concluído",
  "Inativo",
];

const readKanbanPrefs = () => {
  try {
    const raw = localStorage.getItem(KANBAN_PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
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

// Estilos da aplicação - definições de CSS-in-JS para componentes
const styles = {
    detailsModalCard: {
      background: '#f5f3ff',
      borderRadius: '22px',
      boxShadow: '0 20px 45px rgba(49, 22, 118, 0.25), 0 2px 8px rgba(0,0,0,0.08)',
      padding: '24px 28px',
      maxWidth: '1440px',
      maxHeight: '94vh',
      margin: '0 auto',
      position: 'relative',
      border: '1px solid #d9d0ff',
      minWidth: '1040px',
      minHeight: '680px',
      fontFamily: 'inherit',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
    },
    detailsContent: {
      display: 'grid',
      gridTemplateColumns: '1.1fr 1fr',
      gap: '18px',
      minHeight: 0,
      flex: 1,
      overflow: 'hidden',
    },
    detailsMain: {
      display: 'flex',
      flexDirection: 'column',
      background: '#f2edff',
      border: '1px solid #ddd2ff',
      borderRadius: '16px',
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
      display: 'grid',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gap: '12px 24px',
    },
    detailsRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '15px',
      color: '#3e2c9e',
      fontWeight: 500,
    },
    detailsLabel: {
      minWidth: '110px',
      color: '#7c6fb7',
      fontWeight: 600,
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    detailsValue: {
      color: '#2d225a',
      fontWeight: 500,
      fontSize: '15px',
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
      background: '#f2edff',
    },
    detailsObservacoes: {
      background: '#ede7ff',
      borderRadius: '14px',
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
      padding: '18px',
      boxShadow: 'inset 0 0 0 1px #ddd3ff',
      minHeight: '560px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      overflow: 'hidden',
    },
    detailsCommentsHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px',
      paddingBottom: '10px',
      borderBottom: '1px solid #ddd1ff',
    },
    detailsCommentsList: {
      flex: 1,
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
    overflowX: "auto",
    borderRadius: "16px",
    background: "#faf9ff",
    border: "1px solid #d6d0ff",
    padding: "12px",
  },
  table: {
    width: "max-content",
    borderCollapse: "separate",
    borderSpacing: "10px 0",
    minWidth: "100%",
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
    border: "1px solid #d6d0ff",
    borderLeft: "4px solid #7c5cff",
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
    borderColor: "#bca8ff",
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
    zIndex: 1000,
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
  modalTitle: {
    marginBottom: "20px",
    color: "#4c3393",
    fontSize: "24px",
    fontWeight: "600",
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
function DraggableCard({ card, onOpen, densityCfg }) {
  // useDraggable do dnd-kit para tornar o card arrastável
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card._id });
  const [isHovered, setIsHovered] = useState(false);
  
  // Estilo dinâmico baseado no estado de arrasto e hover
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1, // Reduz opacidade durante arrasto
    ...styles.cardItem,
    padding: densityCfg?.cardPadding || styles.cardItem.padding,
    minWidth: densityCfg?.cardMinWidth || styles.cardItem.minWidth,
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

  // Manipulador para abrir o modal de detalhes do card
  const handleDetailClick = (e) => {
    e.stopPropagation(); // Evita propagação do evento para elementos pai
    console.log('[Detalhes] Clique no botão de detalhes do card', card);
    onOpen(card);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setIsHovered(true)}  // Ativa hover
      onMouseLeave={() => setIsHovered(false)} // Desativa hover
      {...attributes} // Propriedades de acessibilidade para drag and drop
    >
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
              ⏱️ SLA: {card.sla}d
            </span>
          )}
        </div>
      </div>

      {/* Rodapé do card com vendedor e botão de detalhes */}
      <div style={styles.cardFooter}>
        <div style={styles.vendorInfo}>
          <User size={12} />
          <span>{card.vendedor?.nome || card.vendedor || card.vendedorId || "Sem vendedor"}</span>
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
  // Estados principais
  const [cards, setCards] = useState([]);           // Lista de todos os cards
  const [selectedCard, setSelectedCard] = useState(null); // Card selecionado para detalhes
  const [statusEdit, setStatusEdit] = useState("Novo");    // Status temporário para edição
  const [commentText, setCommentText] = useState("");      // Texto do comentário sendo escrito
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
    preco: "",
    sla: 0,
    prazo: "",
    observacoes: "",
  });
  const [error, setError] = useState("");                  // Mensagem de erro
  const [activeId, setActiveId] = useState(null);          // ID do card sendo arrastado
  const [isCreating, setIsCreating] = useState(false);     // Flag para criação em andamento
  const [density, setDensity] = useState(() => readKanbanPrefs().density || "confortavel");  // Densidade visual (Bitrix-style)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importRaw, setImportRaw] = useState("");
  const [importDefaultStatus, setImportDefaultStatus] = useState("Novo");
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState("");
  const [externalExportSummary, setExternalExportSummary] = useState("");

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
  const sensors = useSensors(useSensor(PointerSensor));

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
      const targetStatus = String(over.id).replace("column-", ""); // Extrai o nome do status
      const movedCard = cards.find((card) => card._id === active.id);
      
      // Se o status é diferente, atualiza
      if (movedCard && movedCard.status !== targetStatus) {
        try {
          // Envia requisição PUT para atualizar o status
          const response = await api.put(`/cards/${movedCard._id}`, { ...movedCard, status: targetStatus, coluna: targetStatus });
          const updatedCard = response.data;
          
          // Atualiza o estado local com o card modificado
          setCards((prev) => prev.map((card) => (card._id === updatedCard._id ? updatedCard : card)));
          
          // Se o card selecionado foi movido, atualiza também no modal de detalhes
          if (selectedCard && selectedCard._id === updatedCard._id) {
            setSelectedCard(updatedCard);
            setStatusEdit(updatedCard.status);
          }
        } catch (e) {
          console.error("Falha ao mover card", e);
        }
      }
    }
  };

  // Recupera dados do usuário logado do localStorage
  const userData = JSON.parse(localStorage.getItem("user") || "null");
  const seller = userData?.nome || userData?.username || userData?.email || "Sem vendedor";
  const sellerId = userData?._id || userData?.id || null;

  const mentionUsers = [
    seller,
    ...cards.map((c) => c?.vendedor?.nome || c?.vendedor || c?.vendedorId || "").filter(Boolean),
    ...cards.flatMap((c) => (c?.comments || []).map((comment) => comment?.author || "")).filter(Boolean),
  ].filter((name, index, arr) => arr.findIndex((n) => String(n).toLowerCase() === String(name).toLowerCase()) === index);

  // Efeito para carregar cards da API ao montar o componente
  useEffect(() => {
    api.get("/cards")
      .then((res) => setCards(res.data))
      .catch((err) => console.log(err));
  }, []);

  // Colunas do Kanban - estado que permite adicionar/editar/remover colunas dinamicamente
  const [columns, setColumns] = useState(() => {
    const prefs = readKanbanPrefs();
    return Array.isArray(prefs.columns) && prefs.columns.length > 0 ? prefs.columns : DEFAULT_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem(
      KANBAN_PREFS_KEY,
      JSON.stringify({ density, searchTerm, statusFilter, vendorFilter, columns })
    );
  }, [density, searchTerm, statusFilter, vendorFilter, columns]);
  
  // Estados para controle do modal de colunas
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [columnModalType, setColumnModalType] = useState("add"); // add | edit
  const [columnName, setColumnName] = useState("");
  const [editingColumnIndex, setEditingColumnIndex] = useState(null);
  
  // CRUD de colunas - funções para gerenciar colunas dinâmicas
  
  // Abre modal para adicionar nova coluna
  const openAddColumn = () => {
    setColumnModalType("add");
    setColumnName("");
    setIsColumnModalOpen(true);
    setEditingColumnIndex(null);
  };
  
  // Abre modal para editar coluna existente
  const openEditColumn = (idx) => {
    setColumnModalType("edit");
    setColumnName(columns[idx]);
    setIsColumnModalOpen(true);
    setEditingColumnIndex(idx);
  };
  
  // Salva coluna (nova ou editada)
  const handleSaveColumn = () => {
    const name = columnName.trim();
    if (!name) return;
    if (columnModalType === "add") {
      setColumns((prev) => [...prev, name]); // Adiciona nova coluna
    } else if (columnModalType === "edit" && editingColumnIndex !== null) {
      setColumns((prev) => prev.map((col, i) => (i === editingColumnIndex ? name : col))); // Edita coluna existente
    }
    setIsColumnModalOpen(false);
    setColumnName("");
    setEditingColumnIndex(null);
  };
  
  // Exclui coluna (apenas se não tiver cards)
  const handleDeleteColumn = (idx) => {
    const col = columns[idx];
    const hasCards = cards.some((c) => c.status === col);
    if (hasCards) {
      alert("Não é possível excluir uma coluna que possui cards. Mova os cards antes.");
      return;
    }
    setColumns((prev) => prev.filter((_, i) => i !== idx));
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

  // Abre modal de detalhes do card
  const handleOpenCard = (card) => {
    console.log('[Detalhes] handleOpenCard chamado', card);
    setSelectedCard(card);
    setStatusEdit(card.status || "Novo");
    setCommentText("");
  };

  // Fecha modal de detalhes
  const handleCloseCard = () => {
    console.log('[Detalhes] Fechando modal de detalhes');
    setSelectedCard(null);
    setCommentText("");
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
    if (!selectedCard || !commentText.trim()) return;

    // Recupera dados do usuário para identificar autor
    const userData = JSON.parse(localStorage.getItem("user") || "null");
    const author = userData?.nome || userData?.username || userData?.email || "Usuário";
    const authorAvatar = userData?.avatar || "";

    // Cria novo comentário
    const newComment = {
      id: Date.now(), // ID temporário baseado no timestamp
      text: commentText.trim(),
      author,
      authorAvatar,
      createdAt: new Date().toISOString(),
    };

    const updatedComments = [...(selectedCard.comments || []), newComment];
    const cardUpdate = { ...selectedCard, comments: updatedComments };

    try {
      // Envia para API
      const response = await api.put(`/cards/${selectedCard._id}`, cardUpdate);
      const updatedCard = response.data;

      // Atualiza estados localmente
      setCards((prev) => prev.map((c) => (c._id === updatedCard._id ? updatedCard : c)));
      setSelectedCard(updatedCard);
      setCommentText(""); // Limpa campo de comentário
    } catch (err) {
      console.error("erro ao adicionar comentário", err);
      setError("Erro ao adicionar comentário");
    }
  };

  // Salva alterações gerais do card
  const handleSaveCardChanges = async (updates = {}) => {
    if (!selectedCard) return;

    const payload = { ...selectedCard, ...updates };
    try {
      const response = await api.put(`/cards/${selectedCard._id}`, payload);
      const updatedCard = response.data;
      setCards((prev) => prev.map((c) => (c._id === updatedCard._id ? updatedCard : c)));
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
      await api.delete(`/cards/${selectedCard._id}`);
      setCards((prev) => prev.filter((c) => c._id !== selectedCard._id));
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
      _id: undefined,          // Remove ID original
      titulo: `${selectedCard.titulo || selectedCard.cliente || "Card"} (cópia)`, // Adiciona "(cópia)" ao título
      status: "Novo",          // Reseta status para Novo
      coluna: "Novo",          // Reseta coluna
      createdAt: undefined,    // Remove timestamps
      updatedAt: undefined,
    };

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
  const handleChangeStatus = async (newStatus) => {
    if (!selectedCard) return;
    await handleSaveCardChanges({ status: newStatus, coluna: newStatus });
  };

  // Cria novo card com validação de campos obrigatórios
  const handleCreateCard = async () => {
    const { cliente, telefone, endereco, tipoServico } = newCard;
    
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
        preco: newCard.preco ? Number(newCard.preco) : 0,
        sla: newCard.sla ? Number(newCard.sla) : 0,
        prazo: newCard.prazo || null,
        observacoes: newCard.observacoes?.trim() || "",
        coordenadas: {
          lat: newCard.coordenadas.lat?.trim() || "",
          lng: newCard.coordenadas.lng?.trim() || "",
        },
        status: "Novo",
        coluna: "Novo",
        vendedor: seller,
        vendedorId: sellerId,
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
          preco: "",
          sla: 0,
          prazo: "",
          observacoes: "",
        });
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

    const fallbackStatus = normalizeImportStatus(importDefaultStatus, columns, "Novo");
    const extracted = extractImportCards(parsed, columns, fallbackStatus);

    if (extracted.length === 0) {
      setError("Nenhum card encontrado no JSON. Use um array de cards ou export do Trello.");
      return;
    }

    setIsImporting(true);
    try {
      const payloads = extracted.map(({ card, status }) =>
        mapImportedCard({ card, status, seller, sellerId })
      );

      const results = await Promise.allSettled(payloads.map((payload) => api.post("/cards", payload)));
      const createdCards = results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value.data);

      const failedCount = results.length - createdCards.length;

      if (createdCards.length > 0) {
        setCards((prev) => [...createdCards, ...prev]);
      }

      setImportSummary(`Importação finalizada: ${createdCards.length} criado(s), ${failedCount} falha(s).`);
    } catch (importError) {
      console.error("Erro ao importar cards", importError);
      setError("Erro ao importar cards. Tente novamente.");
    } finally {
      setIsImporting(false);
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

    const fallbackStatus = normalizeImportStatus(importDefaultStatus, columns, "Novo");
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
  const filteredCards = (col) => {
    return cards.filter((c) => {
      // Primeiro critério: o status do card deve corresponder à coluna
      let matches = c.status === col;

      // Aplica filtro de busca textual (cliente, título, telefone, endereço)
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        matches = matches && (
          (c.cliente || "").toLowerCase().includes(search) ||
          (c.titulo || "").toLowerCase().includes(search) ||
          (c.telefone || "").toLowerCase().includes(search) ||
          (c.endereco || "").toLowerCase().includes(search)
        );
      }

      // Aplica filtro por status (selecionado no dropdown)
      if (statusFilter) {
        matches = matches && c.status === statusFilter;
      }

      // Aplica filtro por vendedor
      if (vendorFilter) {
        const vendorName = c.vendedor?.nome || c.vendedor || c.vendedorId || "Sem vendedor";
        matches = matches && vendorName === vendorFilter;
      }

      return matches;
    });
  };

  // Renderização do componente principal
  return (
    <div style={styles.container}>
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
          <button
            style={{ ...styles.addButton, background: "linear-gradient(135deg, #cce5ff 0%, #8ec5ff 100%)", color: "#1a3f74" }}
            onClick={() => {
              setIsImportModalOpen(true);
              setImportSummary("");
              setExternalExportSummary("");
              setError("");
            }}
          >
            <FileUp size={15} /> Importar
          </button>
          <button
            style={{ ...styles.addButton, background: "linear-gradient(135deg, #d8f7de 0%, #95e5a7 100%)", color: "#1f5b2e" }}
            onClick={handleExportExcel}
          >
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button
            style={{ ...styles.addButton, background: "linear-gradient(135deg, #e7f0ff 0%, #bdd6ff 100%)", color: "#21468a" }}
            onClick={handleExportCsv}
          >
            <Download size={15} /> CSV
          </button>
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
          {columns.map((status) => (
            <option key={status} value={status}>{status}</option>
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
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                {/* Renderiza cabeçalho com cada coluna e controles de edição */}
                {columns.map((col, idx) => {
                  const columnCards = filteredCards(col);
                  return (
                    <th key={col} style={{ ...styles.th, minWidth: densityCfg.columnWidth }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        {/* Nome da coluna */}
                        <span>{col}</span>
                        {/* Contador de cards na coluna */}
                        <span style={{ background: "#f4efff", padding: "2px 8px", borderRadius: "8px", fontSize: "12px", color: "#5f3dc6", border: "1px solid #d6c7ff" }}>
                          {columnCards.length}
                        </span>
                        {/* Botão para editar coluna */}
                        <button 
                          title="Editar coluna" 
                          style={{ background: "#efe8ff", border: "1px solid #d4c3ff", borderRadius: 6, color: "#6c3bff", cursor: "pointer", fontSize: 14, padding: "2px 5px", marginLeft: 2 }} 
                          onClick={() => openEditColumn(idx)}
                        >
                          <Pencil size={14} />
                        </button>
                        {/* Botão para excluir coluna */}
                        <button 
                          title="Excluir coluna" 
                          style={{ background: "#fff1f1", border: "1px solid #ffd2d2", borderRadius: 6, color: "#b33524", cursor: "pointer", fontSize: 14, padding: "2px 5px", marginLeft: 2 }} 
                          onClick={() => handleDeleteColumn(idx)}
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
                {columns.map((col) => (
                  <td key={col} style={{ ...styles.td, minWidth: densityCfg.columnWidth, width: densityCfg.columnWidth }}>
                    {/* Área droppable para receber cards arrastados */}
                    <DroppableColumn id={`column-${col}`} minHeight={densityCfg.columnMinHeight} padding={densityCfg.columnPadding}>
                      {/* Mapeia e renderiza cada card da coluna */}
                      {filteredCards(col).map((card) => (
                        <DraggableCard key={card._id} card={card} onOpen={handleOpenCard} densityCfg={densityCfg} />
                      ))}
                      {/* Mensagem quando não há cards na coluna */}
                      {filteredCards(col).length === 0 && (
                        <div style={{ textAlign: "center", padding: "42px 16px", color: "#8a79c2", fontSize: "13px" }}>
                          Nenhum card
                        </div>
                      )}
                    </DroppableColumn>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DndContext>

      {/* Modal de criação de card */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}><Plus size={18} style={{ marginRight: 8, verticalAlign: "text-bottom" }} />Criar novo card</h2>
            
            <div style={styles.formGrid}>
              {/* Campo título (opcional) */}
              <input 
                style={styles.modalInput} 
                value={newCard.titulo} 
                onChange={(e) => handleInputChange("titulo", e.target.value)} 
                placeholder="Título do card" 
              />
              
              {/* Campos obrigatórios com indicador * */}
              <input 
                style={styles.modalInput} 
                value={newCard.cliente} 
                onChange={(e) => handleInputChange("cliente", e.target.value)} 
                placeholder="Cliente *" 
              />
              <input 
                style={styles.modalInput} 
                value={newCard.telefone} 
                onChange={(e) => handleInputChange("telefone", e.target.value)} 
                placeholder="Telefone *" 
              />
              <input 
                style={styles.modalInput} 
                value={newCard.endereco} 
                onChange={(e) => handleInputChange("endereco", e.target.value)} 
                placeholder="Endereço *" 
              />
              <input 
                style={styles.modalInput} 
                value={newCard.tipoServico} 
                onChange={(e) => handleInputChange("tipoServico", e.target.value)} 
                placeholder="Tipo de serviço *" 
              />
              
              {/* Campo preço (numérico) */}
              <input 
                style={styles.modalInput} 
                type="number" 
                value={newCard.preco} 
                onChange={(e) => handleInputChange("preco", Number(e.target.value))} 
                placeholder="Preço (R$)" 
              />
              
              {/* Coordenadas geográficas (latitude/longitude) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <input 
                  style={styles.modalInput} 
                  type="text" 
                  value={newCard.coordenadas.lat} 
                  onChange={(e) => handleInputChange("lat", e.target.value)} 
                  placeholder="Latitude" 
                />
                <input 
                  style={styles.modalInput} 
                  type="text" 
                  value={newCard.coordenadas.lng} 
                  onChange={(e) => handleInputChange("lng", e.target.value)} 
                  placeholder="Longitude" 
                />
              </div>

              {/* SLA (dias) e prazo */}
              <input 
                style={styles.modalInput} 
                type="number" 
                value={newCard.sla} 
                onChange={(e) => handleInputChange("sla", Number(e.target.value))} 
                placeholder="SLA (dias)" 
              />
              <input 
                style={styles.modalInput} 
                type="date" 
                value={newCard.prazo} 
                onChange={(e) => handleInputChange("prazo", e.target.value)} 
                placeholder="Prazo" 
              />
              
              {/* Observações (textarea) */}
              <textarea 
                style={styles.modalTextArea} 
                value={newCard.observacoes} 
                onChange={(e) => handleInputChange("observacoes", e.target.value)} 
                placeholder="Observações (opcional)" 
                rows={3} 
              />
            </div>

            {/* Exibe mensagem de erro se houver */}
            {error && <p style={styles.errorText}>{error}</p>}

            {/* Botões de ação */}
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
                <span style={styles.detailsLabel}><DollarSign size={14} /> Preço:</span> 
                <span style={styles.detailsValue}>
                  {selectedCard.preco ? Number(selectedCard.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "--"}
                </span>
              </div>
              <div style={styles.detailsRow}>
                <span style={styles.detailsLabel}>⏱️ SLA:</span> 
                <span style={styles.detailsValue}>{selectedCard.sla || "--"} dias</span>
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
                  {columns.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button onClick={() => handleChangeStatus(statusEdit)} style={styles.saveBtn}>
                  Atualizar
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
                  (selectedCard.comments || []).map((comment, idx) => (
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
                            const cardUpdate = { ...selectedCard, comments: updatedComments };
                            try {
                              const response = await api.put(`/cards/${selectedCard._id}`, cardUpdate);
                              const updatedCard = response.data;
                              setCards((prev) => prev.map((c) => (c._id === updatedCard._id ? updatedCard : c)));
                              setSelectedCard(updatedCard);
                            } catch (err) {
                              setError("Erro ao excluir comentário");
                            }
                          }}><Trash2 size={15} /></button>
                          <button style={{ background: 'none', border: 'none', color: '#4b3b9a', fontSize: 16, cursor: 'pointer' }} title="Editar comentário" onClick={() => {
                            setCommentText(comment.text);
                            const updatedComments = (selectedCard.comments || []).filter((_, i) => i !== idx);
                            const cardUpdate = { ...selectedCard, comments: updatedComments };
                            api.put(`/cards/${selectedCard._id}`, cardUpdate).then((response) => {
                              const updatedCard = response.data;
                              setCards((prev) => prev.map((c) => (c._id === updatedCard._id ? updatedCard : c)));
                              setSelectedCard(updatedCard);
                            });
                          }}><Pencil size={15} /></button>
                        </div>
                      </div>
                      <p style={styles.detailsCommentText}>{comment.text}</p>
                      {comment.attachment && (
                        <div style={{ marginTop: 8 }}>
                          {comment.attachment.type && comment.attachment.type.startsWith('image/') ? (
                            <img src={comment.attachment.data || URL.createObjectURL(new Blob([comment.attachment.data]))} alt={comment.attachment.name} style={{ maxWidth: 320, maxHeight: 220, borderRadius: 8, border: '1px solid #e0e0e0', display: 'block', marginBottom: 6 }} />
                          ) : comment.attachment.type === 'application/pdf' ? (
                            <a href={comment.attachment.data} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b71c1c', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
                              <span style={{ fontSize: 22, display: "inline-flex", alignItems: "center" }}><FileText size={20} /></span> Abrir PDF
                            </a>
                          ) : (
                            <a href={comment.attachment.data} download={comment.attachment.name} style={{ color: '#6c3bff', textDecoration: 'underline', fontSize: 13 }}>
                              <Paperclip size={13} style={{ marginRight: 4, verticalAlign: "text-bottom" }} /> {comment.attachment.name}
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
                {/* Novo formulário de comentário com menção e upload */}
                <CommentInput
                  value={commentText}
                  onChange={setCommentText}
                  onSend={handleAddComment}
                  mentionUsers={mentionUsers}
                  onFile={async (file) => {
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                      const base64 = e.target.result;
                      const userData = JSON.parse(localStorage.getItem("user") || "null");
                      const author = userData?.nome || userData?.username || userData?.email || "Usuário";
                      const authorAvatar = userData?.avatar || "";
                      const fileText = commentText && commentText.trim() ? commentText.trim() : file.name;
                      const newComment = {
                        id: Date.now(),
                        text: fileText,
                        author,
                        authorAvatar,
                        createdAt: new Date().toISOString(),
                        attachment: { name: file.name, type: file.type, data: base64 },
                      };
                      const updatedComments = [...(selectedCard.comments || []), newComment];
                      const cardUpdate = { ...selectedCard, comments: updatedComments };
                      try {
                        const response = await api.put(`/cards/${selectedCard._id}`, cardUpdate);
                        const updatedCard = response.data;
                        setCards((prev) => prev.map((c) => (c._id === updatedCard._id ? updatedCard : c)));
                        setSelectedCard(updatedCard);
                        setCommentText("");
                      } catch (err) {
                        setError("Erro ao anexar arquivo");
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                  placeholder="Escreva um comentário, use @ para menção, ou anexe arquivos/fotos..."
                />
              </div>
            </div>
            </div>
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
              onSave={async (updatedCard) => {
                try {
                  // Envia atualização para API
                  const response = await api.put(`/cards/${editingCard._id}`, updatedCard);
                  const savedCard = response.data;
                  
                  // Atualiza estado dos cards
                  setCards((prev) => prev.map((c) => c._id === savedCard._id ? savedCard : c));
                  
                  // Se o card editado está selecionado, atualiza também
                  if (selectedCard && selectedCard._id === savedCard._id) {
                    setSelectedCard(savedCard);
                    setStatusEdit(savedCard.status);
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

