import { useEffect, useState } from "react";
import api from "../services/api";
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import CardModal from "../Modal/CardModal";

const styles = {
  container: {
    padding: "24px",
    minHeight: "80vh",
    background: "linear-gradient(135deg, #f8f7ff 0%, #f1eefe 100%)",
  },
  header: {
    marginBottom: "28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },
  title: {
    color: "#3e2c9e",
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    background: "linear-gradient(135deg, #5f3dc6 0%, #3e2c9e 100%)",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  addButton: {
    background: "linear-gradient(135deg, #7c5bff 0%, #5a30ff 100%)",
    color: "#fff",
    border: "none",
    padding: "12px 24px",
    borderRadius: "12px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(90,48,255,0.3)",
    fontWeight: "600",
    fontSize: "14px",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  tableContainer: {
    overflowX: "auto",
    borderRadius: "20px",
    background: "transparent",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0 12px",
    minWidth: "1100px",
  },
  th: {
    background: "transparent",
    color: "#5d3fdd",
    padding: "12px 16px",
    textAlign: "left",
    fontSize: "13px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  td: {
    padding: "0 8px",
    verticalAlign: "top",
  },
  cardItem: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "grab",
    border: "1px solid rgba(108,59,255,0.1)",
    position: "relative",
  },
  cardItemHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 24px rgba(62,44,158,0.12), 0 2px 4px rgba(0,0,0,0.04)",
    borderColor: "rgba(108,59,255,0.2)",
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
    color: "#1a1a2e",
    marginBottom: "4px",
    lineHeight: "1.3",
  },
  cardBadge: {
    background: "#f3f0ff",
    color: "#5f3dc6",
    padding: "4px 10px",
    borderRadius: "20px",
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
    borderTop: "1px solid #f0eef8",
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
    background: "transparent",
    border: "none",
    color: "#7c5bff",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: "8px",
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
    padding: "16px 20px",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    border: "1px solid rgba(108,59,255,0.08)",
    boxShadow: "0 2px 8px rgba(62,44,158,0.04)",
  },
};

function DroppableColumn({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: "400px",
        background: isOver ? "rgba(108,59,255,0.06)" : "transparent",
        borderRadius: "16px",
        transition: "background 0.2s ease",
        padding: "4px",
      }}
    >
      {children}
    </div>
  );
}

function DraggableCard({ card, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card._id });
  const [isHovered, setIsHovered] = useState(false);
  
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    ...styles.cardItem,
    ...(isHovered ? styles.cardItemHover : {}),
  };

  const formatPrice = (price) => {
    if (!price) return null;
    return Number(price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const isOverdue = (deadline) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const handleDetailClick = (e) => {
    e.stopPropagation();
    onOpen(card);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...listeners}
      {...attributes}
    >
      <div style={styles.cardHeader}>
        <div style={{ flex: 1 }}>
          <div style={styles.cardTitle}>
            {card.titulo || card.cliente || "Sem título"}
          </div>
          {card.cliente && card.titulo && (
            <div style={{ fontSize: "11px", color: "#8b8aa2", marginTop: "2px" }}>
              {card.cliente}
            </div>
          )}
        </div>
        <div style={styles.cardBadge}>
          <span>⚡</span> {card.status || "Novo"}
        </div>
      </div>

      <div style={styles.cardInfo}>
        {card.tipoServico && (
          <div style={styles.infoRow}>
            <span style={styles.infoIcon}>🛠️</span>
            <span style={styles.infoText}>{card.tipoServico}</span>
          </div>
        )}
        
        {card.endereco && (
          <div style={styles.infoRow}>
            <span style={styles.infoIcon}>📍</span>
            <span style={styles.infoText}>{card.endereco}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
          {card.preco && (
            <span style={styles.priceTag}>
              💰 {formatPrice(card.preco)}
            </span>
          )}
          {card.prazo && (
            <span style={{
              ...styles.deadlineTag,
              background: isOverdue(card.prazo) ? "#ffebee" : "#fff3e0",
              color: isOverdue(card.prazo) ? "#c62828" : "#e65100",
            }}>
              📅 {new Date(card.prazo).toLocaleDateString("pt-BR")}
            </span>
          )}
          {card.sla > 0 && (
            <span style={{ ...styles.deadlineTag, background: "#e3f2fd", color: "#1565c0" }}>
              ⏱️ SLA: {card.sla}d
            </span>
          )}
        </div>
      </div>

      <div style={styles.cardFooter}>
        <div style={styles.vendorInfo}>
          <span>👤</span>
          <span>{card.vendedor || card.vendedorId || "Sem vendedor"}</span>
        </div>
        <button
          onClick={handleDetailClick}
          style={styles.detailButton}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f3f0ff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          Ver detalhes →
        </button>
      </div>
    </div>
  );
}

export default function Board() {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [statusEdit, setStatusEdit] = useState("Novo");
  const [commentText, setCommentText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditCardOpen, setIsEditCardOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [newCard, setNewCard] = useState({
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
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !active) return;

    if (String(over.id).startsWith("column-")) {
      const targetStatus = String(over.id).replace("column-", "");
      const movedCard = cards.find((card) => card._id === active.id);
      if (movedCard && movedCard.status !== targetStatus) {
        try {
          const response = await api.put(`/cards/${movedCard._id}`, { ...movedCard, status: targetStatus, coluna: targetStatus });
          const updatedCard = response.data;
          setCards((prev) => prev.map((card) => (card._id === updatedCard._id ? updatedCard : card)));
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

  const userData = JSON.parse(localStorage.getItem("user") || "null");
  const seller = userData?.nome || userData?.username || userData?.email || "Sem vendedor";
  const sellerId = userData?._id || userData?.id || null;

  useEffect(() => {
    api.get("/cards")
      .then((res) => setCards(res.data))
      .catch((err) => console.log(err));
  }, []);

  const [columns, setColumns] = useState([
    "Novo",
    "Em análise",
    "Agendamento",
    "Agendado",
    "Em execução",
    "Concluído",
    "Inativo",
  ]);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [columnModalType, setColumnModalType] = useState("add"); // add | edit
  const [columnName, setColumnName] = useState("");
  const [editingColumnIndex, setEditingColumnIndex] = useState(null);
  // CRUD de colunas
  const openAddColumn = () => {
    setColumnModalType("add");
    setColumnName("");
    setIsColumnModalOpen(true);
    setEditingColumnIndex(null);
  };
  const openEditColumn = (idx) => {
    setColumnModalType("edit");
    setColumnName(columns[idx]);
    setIsColumnModalOpen(true);
    setEditingColumnIndex(idx);
  };
  const handleSaveColumn = () => {
    const name = columnName.trim();
    if (!name) return;
    if (columnModalType === "add") {
      setColumns((prev) => [...prev, name]);
    } else if (columnModalType === "edit" && editingColumnIndex !== null) {
      setColumns((prev) => prev.map((col, i) => (i === editingColumnIndex ? name : col)));
    }
    setIsColumnModalOpen(false);
    setColumnName("");
    setEditingColumnIndex(null);
  };
  const handleDeleteColumn = (idx) => {
    const col = columns[idx];
    const hasCards = cards.some((c) => c.status === col);
    if (hasCards) {
      alert("Não é possível excluir uma coluna que possui cards. Mova os cards antes.");
      return;
    }
    setColumns((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleInputChange = (field, value) => {
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
    setError("");
  };

  const handleOpenCard = (card) => {
    setSelectedCard(card);
    setStatusEdit(card.status || "Novo");
    setCommentText("");
  };

  const handleCloseCard = () => {
    setSelectedCard(null);
    setCommentText("");
  };

  const handleAddComment = async () => {
    if (!selectedCard || !commentText.trim()) return;

    const userData = JSON.parse(localStorage.getItem("user") || "null");
    const author = userData?.nome || userData?.username || userData?.email || "Usuário";

    const newComment = {
      id: Date.now(),
      text: commentText.trim(),
      author,
      createdAt: new Date().toISOString(),
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
      console.error("erro ao adicionar comentário", err);
      setError("Erro ao adicionar comentário");
    }
  };

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

  const handleDeleteCard = async () => {
    if (!selectedCard) return;

    try {
      await api.delete(`/cards/${selectedCard._id}`);
      setCards((prev) => prev.filter((c) => c._id !== selectedCard._id));
      handleCloseCard();
    } catch (err) {
      console.error("Erro ao deletar card", err);
      setError("Erro ao deletar card");
    }
  };

  const handleDuplicateCard = async () => {
    if (!selectedCard) return;

    const duplicatePayload = {
      ...selectedCard,
      _id: undefined,
      titulo: `${selectedCard.titulo || selectedCard.cliente || "Card"} (cópia)`,
      status: "Novo",
      coluna: "Novo",
      createdAt: undefined,
      updatedAt: undefined,
    };

    try {
      const response = await api.post("/cards", duplicatePayload);
      setCards((prev) => [response.data, ...prev]);
      handleCloseCard();
    } catch (err) {
      console.error("Erro ao duplicar card", err);
      setError("Erro ao duplicar card");
    }
  };

  const handleChangeStatus = async (newStatus) => {
    if (!selectedCard) return;
    await handleSaveCardChanges({ status: newStatus, coluna: newStatus });
  };

  const handleCreateCard = async () => {
    const { cliente, telefone, endereco, tipoServico } = newCard;
    
    // Validação detalhada
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
      // Verificar se o usuário está autenticado
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      if (!userData) {
        setError("Usuário não autenticado. Faça login novamente.");
        setIsCreating(false);
        return;
      }

      // Preparar o payload
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

      const response = await api.post("/cards", payload);
      
      if (response.data) {
        setCards((prev) => [response.data, ...prev]);
        setIsModalOpen(false);
        
        // Resetar formulário
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
      
      // Tratamento detalhado de erros
      if (e.response) {
        console.log("Resposta do servidor:", e.response.data);
        console.log("Status do erro:", e.response.status);
        
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
        setError("Erro de conexão. Verifique sua internet e se o servidor está rodando.");
      } else {
        setError(`Erro: ${e.message}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const filteredCards = (col) => {
    return cards.filter((c) => {
      let matches = c.status === col;

      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        matches = matches && (
          (c.cliente || "").toLowerCase().includes(search) ||
          (c.titulo || "").toLowerCase().includes(search) ||
          (c.telefone || "").toLowerCase().includes(search) ||
          (c.endereco || "").toLowerCase().includes(search)
        );
      }

      if (statusFilter) {
        matches = matches && c.status === statusFilter;
      }

      if (vendorFilter) {
        matches = matches && (c.vendedor === vendorFilter || c.vendedorId === vendorFilter);
      }

      return matches;
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📋 Kanban de Entregas</h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            style={styles.addButton}
            onClick={() => setIsModalOpen(true)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(90,48,255,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(90,48,255,0.3)"; }}
          >
            ✨ Novo Card
          </button>
          <button
            style={{ ...styles.addButton, background: "linear-gradient(135deg, #e0d7fa 0%, #6c3bff 100%)", color: "#6c3bff" }}
            onClick={openAddColumn}
          >
            ➕ Nova Coluna
          </button>
        </div>
      </div>

      <div style={styles.filterContainer}>
        <input
          type="text"
          placeholder="🔍 Buscar por cliente, título, telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.modalInput}
        />
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
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          style={styles.modalInput}
        >
          <option value="">Todos os Vendedores</option>
          {[...new Set(cards.map((c) => c.vendedor || c.vendedorId || "Sem vendedor"))].map((vendor) => (
            <option key={vendor} value={vendor}>{vendor}</option>
          ))}
        </select>
        <button
          onClick={() => { setSearchTerm(""); setStatusFilter(""); setVendorFilter(""); }}
          style={styles.cancelBtn}
        >
          Limpar filtros
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                {columns.map((col, idx) => {
                  const columnCards = filteredCards(col);
                  return (
                    <th key={col} style={styles.th}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                        <span>{col}</span>
                        <span style={{ background: "#f3f0ff", padding: "2px 8px", borderRadius: "20px", fontSize: "12px", color: "#5f3dc6" }}>
                          {columnCards.length}
                        </span>
                        <button title="Editar coluna" style={{ background: "transparent", border: "none", color: "#6c3bff", cursor: "pointer", fontSize: 16, marginLeft: 2 }} onClick={() => openEditColumn(idx)}>✏️</button>
                        <button title="Excluir coluna" style={{ background: "transparent", border: "none", color: "#b33524", cursor: "pointer", fontSize: 16, marginLeft: 2 }} onClick={() => handleDeleteColumn(idx)}>🗑️</button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
                  {/* Modal de criar/editar coluna */}
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
                          <button style={styles.saveBtn} onClick={handleSaveColumn}>{columnModalType === "add" ? "Adicionar" : "Salvar"}</button>
                        </div>
                      </div>
                    </div>
                  )}
            <tbody>
              <tr>
                {columns.map((col) => (
                  <td key={col} style={styles.td}>
                    <DroppableColumn id={`column-${col}`}>
                      {filteredCards(col).map((card) => (
                        <DraggableCard key={card._id} card={card} onOpen={handleOpenCard} />
                      ))}
                      {filteredCards(col).length === 0 && (
                        <div style={{ textAlign: "center", padding: "32px 16px", color: "#aaa8c0", fontSize: "13px" }}>
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
            <h2 style={styles.modalTitle}>✨ Criar novo card</h2>
            
            <div style={styles.formGrid}>
              <input 
                style={styles.modalInput} 
                value={newCard.titulo} 
                onChange={(e) => handleInputChange("titulo", e.target.value)} 
                placeholder="Título do card" 
              />
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
              <input 
                style={styles.modalInput} 
                type="number" 
                value={newCard.preco} 
                onChange={(e) => handleInputChange("preco", Number(e.target.value))} 
                placeholder="Preço (R$)" 
              />
              
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
              />
              <textarea 
                style={styles.modalTextArea} 
                value={newCard.observacoes} 
                onChange={(e) => handleInputChange("observacoes", e.target.value)} 
                placeholder="Observações (opcional)" 
                rows={3} 
              />
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

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

      {/* Modal de detalhes do card */}
      {selectedCard && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: "620px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, color: "#4c3393", fontSize: "22px" }}>{selectedCard.titulo || selectedCard.cliente || "Detalhes do card"}</h2>
              <button onClick={handleCloseCard} style={{ border: "none", background: "transparent", fontSize: "24px", cursor: "pointer", color: "#7f6ad7" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              <p><strong>👤 Cliente:</strong> {selectedCard.cliente}</p>
              <p><strong>📞 Telefone:</strong> {selectedCard.telefone}</p>
              <p><strong>📍 Endereço:</strong> {selectedCard.endereco}</p>
              <p><strong>🛠️ Serviço:</strong> {selectedCard.tipoServico}</p>
              <p><strong>💰 Preço:</strong> {selectedCard.preco ? Number(selectedCard.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "--"}</p>
              <p><strong>⏱️ SLA:</strong> {selectedCard.sla || "--"} dias</p>
              <p><strong>📅 Prazo:</strong> {selectedCard.prazo ? new Date(selectedCard.prazo).toLocaleDateString("pt-BR") : "--"}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                <strong>📊 Status:</strong>
                <select value={statusEdit} onChange={(e) => setStatusEdit(e.target.value)} style={styles.modalInput}>
                  {columns.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button onClick={() => handleChangeStatus(statusEdit)} style={styles.saveBtn}>Atualizar</button>
              </div>
              {selectedCard.observacoes && <p><strong>📝 Observações:</strong> {selectedCard.observacoes}</p>}
            </div>
            <div style={{ marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
              <button onClick={() => { setEditingCard(selectedCard); setIsEditCardOpen(true); setSelectedCard(null); }} style={{ ...styles.cancelBtn, background: "#e3f2fd", color: "#1565c0" }}>✏️ Editar</button>
              <button onClick={handleSaveCardChanges} style={styles.cancelBtn}>💾 Salvar alterações</button>
              <button onClick={handleDuplicateCard} style={{ ...styles.cancelBtn, background: "#ebf2ff", color: "#1f4baf" }}>📋 Duplicar</button>
              <button onClick={handleDeleteCard} style={{ ...styles.cancelBtn, background: "#ffe9e4", color: "#b33524" }}>🗑️ Excluir</button>
            </div>
            <div style={{ marginTop: "20px" }}>
              <h3 style={{ margin: "0 0 12px", color: "#4b3b9a", fontSize: "18px" }}>💬 Comentários</h3>
              {(selectedCard.comments || []).length === 0 ? (
                <p style={{ color: "#766fa5", fontSize: "13px", textAlign: "center", padding: "20px" }}>Nenhum comentário ainda.</p>
              ) : (
                (selectedCard.comments || []).map((comment) => (
                  <div key={comment.id} style={{ padding: "12px", background: "#f6f2ff", borderRadius: "12px", marginBottom: "10px" }}>
                    <p style={{ margin: 0, color: "#4f3dab", fontWeight: "600" }}>{comment.author || "Usuário"}:</p>
                    <p style={{ margin: "6px 0 0", color: "#4f3dab" }}>{comment.text}</p>
                    <small style={{ color: "#7c6fb7", fontSize: "11px" }}>{new Date(comment.createdAt).toLocaleString("pt-BR")}</small>
                  </div>
                ))
              )}
              <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
                <textarea style={styles.modalTextArea} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Escreva um comentário..." rows={3} />
                <button style={styles.saveBtn} onClick={handleAddComment}>Adicionar comentário</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição de card */}
      {isEditCardOpen && editingCard && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: "700px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, color: "#4c3393", fontSize: "22px" }}>✏️ Editar Card</h2>
              <button 
                onClick={() => { setIsEditCardOpen(false); setEditingCard(null); }} 
                style={{ border: "none", background: "transparent", fontSize: "24px", cursor: "pointer", color: "#7f6ad7", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#ff4444"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#7f6ad7"}
              >
                ×
              </button>
            </div>
            <CardModal 
              card={editingCard} 
              onSave={async (updatedCard) => {
                try {
                  const response = await api.put(`/cards/${editingCard._id}`, updatedCard);
                  const savedCard = response.data;
                  
                  setCards((prev) => prev.map((c) => c._id === savedCard._id ? savedCard : c));
                  
                  if (selectedCard && selectedCard._id === savedCard._id) {
                    setSelectedCard(savedCard);
                    setStatusEdit(savedCard.status);
                  }
                  
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