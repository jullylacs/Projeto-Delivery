import { useEffect, useState } from "react";
import api from "../services/api";
import { DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";

const styles = {
  container: {
    padding: "24px",
    minHeight: "80vh",
    background: "linear-gradient(180deg, #f8f7ff 0%, #f2f0ff 100%)",
  },
  header: {
    marginBottom: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },
  title: {
    color: "#3e2c9e",
    fontSize: "20px",
    fontWeight: "800",
  },
  addButton: {
    background: "linear-gradient(90deg, #8b64ff, #5a30ff)",
    color: "#fff",
    border: "none",
    padding: "11px 14px",
    borderRadius: "999px",
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(108,59,255,0.25)",
    fontWeight: "700",
  },
  tableContainer: {
    overflowX: "auto",
    borderRadius: "14px",
    boxShadow: "0 10px 30px rgba(62,44,158,0.12)",
    border: "1px solid rgba(108,59,255,0.12)",
    background: "#fff",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "900px",
  },
  th: {
    borderBottom: "1px solid rgba(0,0,0,0.1)",
    background: "linear-gradient(90deg, rgba(108,59,255,0.12) 0%, rgba(108,59,255,0.25) 100%)",
    color: "#5d3fdd",
    padding: "12px 10px",
    textAlign: "left",
    fontSize: "13px",
    letterSpacing: "0.02em",
    fontWeight: "700",
  },
  td: {
    borderBottom: "1px solid #eee",
    padding: "12px",
    verticalAlign: "top",
    minWidth: "180px",
    background: "#fbfbff",
  },
  cardRow: {
    display: "grid",
    gap: "10px",
  },
  cardItem: {
    padding: "12px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #ffffff, #f9f7ff)",
    boxShadow: "0 6px 14px rgba(58,31,150,0.12)",
    border: "1px solid rgba(108,59,255,0.16)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  cardItemHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 10px 22px rgba(62,44,158,0.2)",
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#3f2f9c",
    marginBottom: "5px",
    textTransform: "capitalize"
  },
  cardSub: {
    fontSize: "13px",
    margin: "2px 0",
    color: "#575661",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    maxWidth: "540px",
    boxShadow: "0 20px 60px rgba(33,33,99,0.2)",
    border: "1px solid rgba(108,59,255,0.18)",
  },
  modalInput: {
    width: "100%",
    border: "1px solid #d6d0ff",
    borderRadius: "10px",
    padding: "10px 12px",
    background: "#faf9ff",
    color: "#1e1a61",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s ease",
  },
  modalTextArea: {
    width: "100%",
    border: "1px solid #d6d0ff",
    borderRadius: "10px",
    padding: "10px 12px",
    background: "#faf9ff",
    color: "#1e1a61",
    fontSize: "14px",
    minHeight: "70px",
    outline: "none",
  },
  actionGroup: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "12px",
  },
  cancelBtn: {
    border: "1px solid #c4bfff",
    background: "#f8f7ff",
    color: "#5b4eaa",
    padding: "8px 13px",
    borderRadius: "9px",
    cursor: "pointer",
  },
  saveBtn: {
    border: "none",
    background: "linear-gradient(90deg, #7c59ff, #5b3be2)",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "700",
  },
  errorText: {
    color: "#c0392b",
    fontSize: "13px",
    fontWeight: "600",
    margin: "8px 0 0",
  },
};

function DroppableColumn({ id, isOver, children }) {
  const { setNodeRef, isOver: droppableOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: "80px",
        background: droppableOver ? "rgba(108,59,255,0.12)" : "transparent",
        borderRadius: "10px",
        transition: "background 0.2s ease",
      }}
    >
      {children}
    </div>
  );
}

function DraggableCard({ card, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card._id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={{ ...styles.cardItem, ...style }}>
      <div style={{ display: "grid", gap: "6px", cursor: "grab" }} {...listeners} {...attributes}>
        <div style={styles.cardTitle}>{card.titulo || card.cliente || "Sem título"}</div>
        {card.preco ? <div style={styles.cardSub}>💲 {Number(card.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div> : null}
        <div style={styles.cardSub}>🛠 {card.tipoServico || "-"}</div>
        <div style={styles.cardSub}>📍 {card.endereco || "-"}</div>
        {card.coordenadas?.lat && card.coordenadas?.lng && (
          <div style={styles.cardSub}>📌 {card.coordenadas.lat}, {card.coordenadas.lng}</div>
        )}
        <div style={styles.cardSub}>📅 {card.prazo ? new Date(card.prazo).toLocaleDateString("pt-BR") : "Sem prazo"}</div>
        <div style={{ ...styles.cardSub, color: "#7d55a8" }}>👤 {card.vendedor || card.vendedorId || "Sem vendedor"}</div>
        {card.observacoes && <div style={styles.cardSub}>📝 {card.observacoes}</div>}
      </div>
      <button
        onClick={() => onOpen(card)}
        style={{ marginTop: "8px", border: "none", background: "#e7e1ff", color: "#4f3dab", borderRadius: "8px", padding: "6px 8px", cursor: "pointer", width: "100%", fontWeight: "600" }}
      >
        Ver detalhes
      </button>
    </div>
  );
}

export default function Board() {
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [statusEdit, setStatusEdit] = useState("Novo");
  const [commentText, setCommentText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const columns = ["Novo", "Em análise", "Agendamento", "Agendado", "Em execução", "Concluído", "Inativo"];

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
    }
  };

  const handleDuplicateCard = async () => {
    if (!selectedCard) return;

    const duplicatePayload = {
      ...selectedCard,
      _id: undefined,
      title: `${selectedCard.titulo || selectedCard.cliente || "Card"} (cópia)`,
      status: "Novo",
      createdAt: undefined,
      updatedAt: undefined,
    };

    try {
      const response = await api.post("/cards", duplicatePayload);
      setCards((prev) => [response.data, ...prev]);
      handleCloseCard();
    } catch (err) {
      console.error("Erro ao duplicar card", err);
    }
  };

  const handleChangeStatus = async (newStatus) => {
    if (!selectedCard) return;
    await handleSaveCardChanges({ status: newStatus, coluna: newStatus });
  };

  const handleCreateCard = async () => {
    const { cliente, telefone, endereco, tipoServico } = newCard;
    if (!cliente || !telefone || !endereco || !tipoServico) {
      setError("Preencha todos os campos obrigatórios: cliente, telefone, endereço e tipo de serviço.");
      return;
    }

    try {
      const payload = {
        ...newCard,
        status: "Novo",
        vendedor: seller,
        vendedorId: sellerId,
        ip: "",
        coluna: "Novo",
      };

      const response = await api.post("/cards", payload);
      setCards((prev) => [response.data, ...prev]);
      setIsModalOpen(false);
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
    } catch (e) {
      setError("Não foi possível criar o card. Tente novamente.");
      console.error(e);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Kanban de Entregas</h1>
        <button style={styles.addButton} onClick={() => setIsModalOpen(true)}>
          + Novo Card
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col} style={styles.th}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {columns.map((col) => (
                  <td key={col} style={styles.td}>
                    <DroppableColumn id={`column-${col}`}>
                      <div style={styles.cardRow}>
                        {cards
                          .filter((c) => c.status === col)
                          .map((card) => (
                            <DraggableCard key={card._id} card={card} onOpen={handleOpenCard} />
                          ))}
                      </div>
                    </DroppableColumn>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DndContext>

      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={{ marginBottom: "14px", color: "#4c3393" }}>Criar novo card</h2>
            <div style={{ display: "grid", gap: "12px" }}>
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
                placeholder="SLA"
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
              />
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.actionGroup}>
              <button style={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>
                Cancelar
              </button>
              <button style={styles.saveBtn} onClick={handleCreateCard}>
                Salvar card
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCard && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modal, maxWidth: "620px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ margin: 0, color: "#4c3393" }}>{selectedCard.titulo || selectedCard.cliente || "Detalhes do card"}</h2>
              <button onClick={handleCloseCard} style={{ border: "none", background: "transparent", fontSize: "20px", cursor: "pointer", color: "#7f6ad7" }}>×</button>
            </div>

            <p><strong>Cliente:</strong> {selectedCard.cliente}</p>
            <p><strong>Telefone:</strong> {selectedCard.telefone}</p>
            <p><strong>Endereço:</strong> {selectedCard.endereco}</p>
            <p><strong>Serviço:</strong> {selectedCard.tipoServico}</p>
            <p><strong>Preço:</strong> {selectedCard.preco ? Number(selectedCard.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "--"}</p>
            <p><strong>SLA:</strong> {selectedCard.sla || "--"}</p>
            <p><strong>Prazo:</strong> {selectedCard.prazo ? new Date(selectedCard.prazo).toLocaleDateString("pt-BR") : "--"}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <strong>Status: </strong>
              <select
                value={statusEdit}
                onChange={(e) => setStatusEdit(e.target.value)}
                style={{ borderRadius: "8px", border: "1px solid #d3caff", padding: "5px 8px" }}
              >
                {["Novo", "Em análise", "Agendamento", "Agendado", "Em execução", "Concluído", "Inativo"].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <button
                onClick={() => handleChangeStatus(statusEdit)}
                style={{ border: "none", background: "#6c3bff", color: "white", borderRadius: "8px", padding: "5px 10px", cursor: "pointer" }}
              >
                Atualizar
              </button>
            </div>
            {selectedCard.observacoes && <p><strong>Observações:</strong> {selectedCard.observacoes}</p>}

            <div style={{ marginBottom: "12px", display: "flex", gap: "10px" }}>
              <button
                onClick={handleSaveCardChanges}
                style={{ border: "1px solid #c4bfff", background: "#f8f7ff", color: "#5b4eaa", padding: "8px", borderRadius: "9px", cursor: "pointer" }}
              >
                Salvar alterações
              </button>
              <button
                onClick={handleDuplicateCard}
                style={{ border: "1px solid #69a7ff", background: "#ebf2ff", color: "#1f4baf", padding: "8px", borderRadius: "9px", cursor: "pointer" }}
              >
                Duplicar card
              </button>
              <button
                onClick={handleDeleteCard}
                style={{ border: "1px solid #ff8b82", background: "#ffe9e4", color: "#b33524", padding: "8px", borderRadius: "9px", cursor: "pointer" }}
              >
                Excluir card
              </button>
            </div>

            <div style={{ marginTop: "18px" }}>
              <h3 style={{ margin: "0 0 8px", color: "#4b3b9a" }}>Comentários</h3>

              {(selectedCard.comments || []).length === 0 ? (
                <p style={{ color: "#766fa5", fontSize: "13px" }}>Nenhum comentário ainda.</p>
              ) : (
                (selectedCard.comments || []).map((comment) => (
                  <div key={comment.id} style={{ padding: "8px", background: "#f6f2ff", borderRadius: "9px", marginBottom: "8px" }}>
                    <p style={{ margin: 0, color: "#4f3dab", fontWeight: "600" }}>{comment.author || "Usuário"}:</p>
                    <p style={{ margin: "4px 0 0", color: "#4f3dab" }}>{comment.text}</p>
                    <small style={{ color: "#7c6fb7" }}>{new Date(comment.createdAt).toLocaleString("pt-BR")}</small>
                  </div>
                ))
              )}

              <div style={{ display: "grid", gap: "8px", marginTop: "12px" }}>
                <textarea
                  style={styles.modalTextArea}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva um comentário..."
                  rows={3}
                />
                <button style={styles.saveBtn} onClick={handleAddComment}>
                  Adicionar comentário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

