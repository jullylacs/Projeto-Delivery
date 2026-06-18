import { useEffect, useState, useCallback } from "react";
import api from "../services/api";

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

function diasRestantes(deleted_at) {
  if (!deleted_at) return 30;
  const diff = TRINTA_DIAS_MS - (Date.now() - new Date(deleted_at).getTime());
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function corDias(dias) {
  if (dias <= 3) return "#ef4444";
  if (dias <= 7) return "#f97316";
  return "#7c3aed";
}

function formatarData(iso) {
  if (!iso) return "–";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const BOARD_LABEL = { delivery: "Delivery", comercial: "Comercial", bko: "BKO" };
const BOARD_COLOR = {
  delivery:  { bg: "#dbeafe", color: "#1d4ed8" },
  comercial: { bg: "#d1fae5", color: "#065f46" },
  bko:       { bg: "#fef3c7", color: "#92400e" },
};

function CardLixeira({ card, onRestaurar, onExcluir, processando }) {
  const [confirmando, setConfirmando] = useState(false);
  const dias = diasRestantes(card.deleted_at);
  const cor = corDias(dias);
  const board = card.column?.board;
  const boardStyle = BOARD_COLOR[board] || { bg: "#f3f4f6", color: "#374151" };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #e5e7eb",
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        opacity: processando ? 0.5 : 1,
        transition: "opacity 200ms, box-shadow 180ms",
      }}
      onMouseEnter={(e) => { if (!processando) e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.13)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)"; }}
    >
      {/* Topo colorido com dias restantes */}
      <div style={{
        background: `${cor}18`,
        borderBottom: `3px solid ${cor}`,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 15 }}>🗑️</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: cor, letterSpacing: 0.3 }}>
            {dias === 0 ? "Expira hoje" : `Expira em ${dias} ${dias === 1 ? "dia" : "dias"}`}
          </span>
        </div>
        {board && (
          <span style={{
            background: boardStyle.bg, color: boardStyle.color,
            borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700,
            letterSpacing: 0.4,
          }}>
            {BOARD_LABEL[board] || board}
          </span>
        )}
      </div>

      {/* Corpo */}
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Nome do cliente */}
        <div style={{ fontWeight: 700, fontSize: 15, color: "#1f2b46", lineHeight: 1.3 }}>
          {card.cliente || `Card #${card.id}`}
        </div>

        {/* Campos informativos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {card.titulo && (
            <InfoRow label="Card" value={card.titulo} />
          )}
          {card.column?.nome && (
            <InfoRow label="Coluna" value={card.column.nome} />
          )}
          {card.vendedor?.nome && (
            <InfoRow label="Vendedor" value={card.vendedor.nome} />
          )}
          {card.tipoServico && (
            <InfoRow label="Serviço" value={card.tipoServico} />
          )}
          {card.excluido_por_nome && (
            <InfoRow label="Excluído por" value={card.excluido_por_nome} />
          )}
          <InfoRow label="Excluído em" value={formatarData(card.deleted_at)} />
        </div>
      </div>

      {/* Rodapé com ações */}
      <div style={{
        padding: "10px 14px",
        borderTop: "1px solid #f3f4f6",
        display: "flex",
        gap: 8,
        justifyContent: "flex-end",
      }}>
        {confirmando ? (
          <>
            <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600, alignSelf: "center", marginRight: 4 }}>
              Excluir permanentemente?
            </span>
            <button
              onClick={() => { setConfirmando(false); onExcluir(card.id); }}
              style={btnStyle("#dc2626", "#fff")}
            >
              Sim
            </button>
            <button
              onClick={() => setConfirmando(false)}
              style={btnStyle("#f3f4f6", "#374151")}
            >
              Não
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onRestaurar(card.id)}
              disabled={processando}
              style={btnStyle("#f0fdf4", "#16a34a", "#bbf7d0")}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#dcfce7"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#f0fdf4"; }}
            >
              ↩ Restaurar
            </button>
            <button
              onClick={() => setConfirmando(true)}
              disabled={processando}
              style={btnStyle("#fff5f5", "#dc2626", "#fecaca")}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff5f5"; }}
            >
              ✕ Excluir
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 6, fontSize: 12, lineHeight: 1.4 }}>
      <span style={{ color: "#9ca3af", minWidth: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#374151", fontWeight: 500, wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

function btnStyle(bg, color, border) {
  return {
    background: bg, color,
    border: border ? `1px solid ${border}` : "none",
    borderRadius: 8, padding: "6px 14px",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    transition: "background 150ms",
  };
}

function filtrar(cards, busca, board) {
  let resultado = cards;
  if (board) resultado = resultado.filter((c) => c.column?.board === board);
  if (busca.trim()) {
    const q = busca.toLowerCase();
    resultado = resultado.filter((c) =>
      [c.cliente, c.titulo, c.column?.nome, c.vendedor?.nome, c.excluido_por_nome, c.tipoServico]
        .some((v) => v && String(v).toLowerCase().includes(q))
    );
  }
  return resultado;
}

export default function Lixeira() {
  const [cards, setCards] = useState([]);
  const [busca, setBusca] = useState("");
  const [boardFiltro, setBoardFiltro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [processandoId, setProcessandoId] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get("/cards/trash");
      setCards(Array.isArray(data) ? data : []);
    } catch (e) {
      setErro(e?.response?.data?.error || "Erro ao carregar lixeira");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function restaurar(id) {
    setProcessandoId(id);
    try {
      await api.post(`/cards/${id}/restore`);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao restaurar card");
    } finally {
      setProcessandoId(null);
    }
  }

  async function excluirPermanente(id) {
    setProcessandoId(id);
    try {
      await api.delete(`/cards/${id}/permanent`);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao excluir permanentemente");
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1f2b46", margin: 0 }}>
          🗑️ Lixeira
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "6px 0 0" }}>
          Cards excluídos ficam aqui por 30 dias antes de serem removidos permanentemente.
          {cards.length > 0 && (
            <span style={{ marginLeft: 8, background: "#ede9fe", color: "#7c3aed", padding: "2px 9px", borderRadius: 9, fontSize: 12, fontWeight: 600 }}>
              {cards.length} {cards.length === 1 ? "card" : "cards"}
            </span>
          )}
        </p>
      </div>

      {/* Barra de pesquisa + filtros de board */}
      {!carregando && !erro && cards.length > 0 && (
        <div style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          {/* Input de pesquisa */}
          <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              fontSize: 15, color: "#9ca3af", pointerEvents: "none",
            }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Pesquisar por cliente, card, coluna..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "9px 36px 9px 36px",
                borderRadius: 10, border: "1px solid #e5e7eb",
                fontSize: 13, color: "#1f2b46",
                background: "#fff",
                outline: "none",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                transition: "border-color 150ms",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
            />
            {busca && (
              <button
                onClick={() => setBusca("")}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "#9ca3af", fontSize: 16, lineHeight: 1, padding: 2,
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Botões de filtro por board */}
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { valor: null,        label: "Todos" },
              { valor: "delivery",  label: "Delivery",  bg: "#dbeafe", cor: "#1d4ed8", borda: "#93c5fd" },
              { valor: "comercial", label: "Comercial", bg: "#d1fae5", cor: "#065f46", borda: "#6ee7b7" },
              { valor: "bko",       label: "BKO",       bg: "#fef3c7", cor: "#92400e", borda: "#fcd34d" },
            ].map(({ valor, label, bg, cor, borda }) => {
              const ativo = boardFiltro === valor;
              return (
                <button
                  key={label}
                  onClick={() => setBoardFiltro(valor)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 9,
                    border: `1px solid ${ativo ? (borda || "#7c3aed") : "#e5e7eb"}`,
                    background: ativo ? (bg || "#ede9fe") : "#fff",
                    color: ativo ? (cor || "#7c3aed") : "#6b7280",
                    fontSize: 12, fontWeight: ativo ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 150ms",
                    boxShadow: ativo ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {label}
                  {valor && (
                    <span style={{
                      marginLeft: 5, fontSize: 11,
                      background: ativo ? `${cor}22` : "#f3f4f6",
                      color: ativo ? cor : "#9ca3af",
                      borderRadius: 5, padding: "1px 5px",
                    }}>
                      {cards.filter((c) => c.column?.board === valor).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {carregando && (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 14 }}>
          Carregando...
        </div>
      )}

      {!carregando && erro && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "16px 20px", color: "#dc2626", fontSize: 14 }}>
          {erro}
        </div>
      )}

      {!carregando && !erro && cards.length === 0 && (
        <div style={{
          textAlign: "center", padding: "64px 20px",
          background: "#fff", borderRadius: 16,
          border: "1px dashed #d1d5db",
        }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🗑️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#6b7280" }}>Lixeira vazia</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
            Nenhum card excluído nos últimos 30 dias.
          </div>
        </div>
      )}

      {!carregando && !erro && cards.length > 0 && (() => {
        const visíveis = filtrar(cards, busca, boardFiltro);
        return (
          <>
            {visíveis.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "48px 20px",
                background: "#fff", borderRadius: 14,
                border: "1px dashed #d1d5db", color: "#9ca3af", fontSize: 13,
              }}>
                Nenhum card encontrado para "<strong>{busca}</strong>".
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}>
                {visíveis.map((card) => (
                  <CardLixeira
                    key={card.id}
                    card={card}
                    onRestaurar={restaurar}
                    onExcluir={excluirPermanente}
                    processando={processandoId === card.id}
                  />
                ))}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
