import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

export default function Dashboard() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/cards")
      .then((res) => {
        setCards(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError("Não foi possível carregar os dados");
        setLoading(false);
        console.error(err);
      });
  }, []);

  const stats = useMemo(() => {
    const total = cards.length;
    const concluido = cards.filter((c) => c.status === "Concluído" || c.status.toLowerCase() === "concluído").length;
    const restante = total - concluido;
    const ratio = total > 0 ? (concluido / total) * 100 : 0;
    return { total, concluido, restante, ratio };
  }, [cards]);

  if (loading) {
    return (
      <div style={{ padding: "22px" }}>
        <h2>Dashboard</h2>
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "22px", background: "#f5f4ff", minHeight: "90vh" }}>
      <div style={{ marginBottom: "18px" }}>
        <h2 style={{ margin: 0, color: "#3c2f9f" }}>Dashboard</h2>
        <p style={{ color: "#5f5a88" }}>Resumo de tarefas concluídas e em andamento</p>
      </div>

      {error ? (
        <div style={{ color: "#a13333" }}>{error}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px", maxWidth: "660px" }}>
          <div style={{ background: "#fff", border: "1px solid #e0ddff", borderRadius: "12px", padding: "16px", boxShadow: "0 8px 18px rgba(62,44,158,0.08)" }}>
            <strong style={{ fontSize: "16px", color: "#3c2f9f" }}>
              Total de cards: {stats.total}
            </strong>
            <div style={{ marginTop: "12px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ background: "#e8e2ff", color: "#5d3fdd", padding: "6px 10px", borderRadius: "8px", fontWeight: "600" }}>
                Concluído: {stats.concluido}
              </span>
              <span style={{ background: "#fff7f0", color: "#c85b2d", padding: "6px 10px", borderRadius: "8px", fontWeight: "600" }}>
                Não concluído: {stats.restante}
              </span>
            </div>

            <div style={{ marginTop: "12px" }}>
              <div style={{ height: "18px", width: "100%", background: "#ebeaff", borderRadius: "9px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${stats.ratio}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #6c3bff, #655dff)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <small style={{ color: "#6c65a7" }}>{stats.ratio.toFixed(1)}% concluído</small>
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e0ddff", borderRadius: "12px", padding: "16px", boxShadow: "0 8px 18px rgba(62,44,158,0.08)" }}>
            <h3 style={{ marginTop: 0, color: "#4b3b9a" }}>Gráfico de status</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", padding: "16px 0" }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    height: `${stats.restante === 0 ? 8 : (stats.restante / Math.max(stats.total, 1)) * 220}px`,
                    background: "#ffb570",
                    borderRadius: "12px 12px 0 0",
                    transition: "height 0.3s ease",
                  }}
                />
                <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#5d3fdd" }}>Não concluído</p>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    height: `${stats.concluido === 0 ? 8 : (stats.concluido / Math.max(stats.total, 1)) * 220}px`,
                    background: "#7d8fff",
                    borderRadius: "12px 12px 0 0",
                    transition: "height 0.3s ease",
                  }}
                />
                <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#5d3fdd" }}>Concluído</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}