import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import SLAIndicator from "../components/UI/SLAIndicator";

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

  // Calcula estatísticas dos cards de forma otimizada (memoizada)
  const stats = useMemo(() => {
    const total = cards.length;
    const concluido = cards.filter((c) => c.status === "Concluído").length;
    const restante = total - concluido;
    const ratio = total > 0 ? (concluido / total) * 100 : 0;

    // Status breakdown
    const statusBreakdown = {
      novo: cards.filter((c) => c.status === "Novo").length,
      analise: cards.filter((c) => c.status === "Em análise").length,
      agendamento: cards.filter((c) => c.status === "Agendamento").length,
      agendado: cards.filter((c) => c.status === "Agendado").length,
      execucao: cards.filter((c) => c.status === "Em execução").length,
      concluido: concluido,
      inativo: cards.filter((c) => c.status === "Inativo").length,
    };

    // SLA alerts
    const now = new Date();
    const slaViolations = cards.filter((c) => {
      if (!c.prazo || c.status === "Concluído" || c.status === "Inativo") return false;
      const deadline = new Date(c.prazo);
      return deadline < now; // Vencido
    });

    const slaWarnings = cards.filter((c) => {
      if (!c.prazo || c.status === "Concluído" || c.status === "Inativo") return false;
      const deadline = new Date(c.prazo);
      const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 3;
    });

    // Vendor performance
    const vendors = [...new Set(cards.map((c) => c.vendedor || c.vendedorId || "Sem vendedor"))];
    const vendorStats = vendors.map((vendor) => {
      const vendorCards = cards.filter((c) => c.vendedor === vendor || c.vendedorId === vendor || (!c.vendedor && !c.vendedorId && vendor === "Sem vendedor"));
      const vendorCompleted = vendorCards.filter((c) => c.status === "Concluído").length;
      return {
        vendor,
        total: vendorCards.length,
        completed: vendorCompleted,
        ratio: vendorCards.length > 0 ? (vendorCompleted / vendorCards.length) * 100 : 0,
      };
    });

    return {
      total,
      concluido,
      restante,
      ratio,
      statusBreakdown,
      slaViolations: slaViolations.length,
      slaWarnings: slaWarnings.length,
      vendorStats,
    };
  }, [cards]);

  if (loading) {
    return (
      <div style={{ padding: "22px" }}>
        <h2>Dashboard</h2>
        <p>Carregando dados...</p>
      </div>
    );
  }

  const styles = {
    container: {
      padding: "24px",
      background: "linear-gradient(180deg, #f8f7ff 0%, #f2f0ff 100%)",
      minHeight: "90vh",
    },
    header: {
      marginBottom: "24px",
    },
    title: {
      margin: 0,
      color: "#3c2f9f",
      fontSize: "24px",
      fontWeight: "800",
    },
    subtitle: {
      color: "#5f5a88",
      fontSize: "14px",
      marginTop: "4px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "16px",
      marginBottom: "24px",
    },
    card: {
      background: "#fff",
      border: "1px solid rgba(108,59,255,0.12)",
      borderRadius: "14px",
      padding: "18px",
      boxShadow: "0 8px 18px rgba(62,44,158,0.08)",
    },
    cardTitle: {
      fontSize: "13px",
      fontWeight: "700",
      color: "#6c65a7",
      textTransform: "uppercase",
      marginBottom: "12px",
      letterSpacing: "0.5px",
    },
    cardValue: {
      fontSize: "32px",
      fontWeight: "800",
      color: "#3c2f9f",
      marginBottom: "8px",
    },
    alertBox: {
      padding: "12px",
      borderRadius: "8px",
      marginBottom: "8px",
      fontSize: "13px",
      fontWeight: "500",
    },
    alertRed: {
      backgroundColor: "#ffebee",
      borderLeft: "4px solid #d32f2f",
      color: "#c62828",
      paddingLeft: "12px",
    },
    alertOrange: {
      backgroundColor: "#fff3e0",
      borderLeft: "4px solid #f57c00",
      color: "#e65100",
      paddingLeft: "12px",
    },
    chartRow: {
      display: "flex",
      alignItems: "flex-end",
      gap: "8px",
      padding: "16px 0",
      height: "200px",
    },
    chartBar: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-end",
    },
    barFill: {
      width: "100%",
      borderRadius: "12px 12px 0 0",
      transition: "height 0.3s ease",
      minHeight: "4px",
    },
    barLabel: {
      marginTop: "8px",
      fontSize: "11px",
      color: "#6c65a7",
      textAlign: "center",
      fontWeight: "500",
    },
    progressBar: {
      width: "100%",
      height: "8px",
      background: "#ebeaff",
      borderRadius: "4px",
      overflow: "hidden",
      marginTop: "8px",
    },
    progressFill: {
      height: "100%",
      background: "linear-gradient(90deg, #8b64ff, #5a30ff)",
      transition: "width 0.3s ease",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Dashboard</h1>
        <p style={styles.subtitle}>Resumo de performance e alertas do sistema</p>
      </div>

      {error ? (
        <div style={{ color: "#a13333" }}>{error}</div>
      ) : (
        <>
          {/* Alertas de SLA */}
          {(stats.slaViolations > 0 || stats.slaWarnings > 0) && (
            <div style={styles.grid}>
              {stats.slaViolations > 0 && (
                <div style={{ ...styles.card, borderLeft: "4px solid #d32f2f" }}>
                  <div style={styles.cardTitle}>🔴 Violações de SLA</div>
                  <div style={styles.cardValue}>{stats.slaViolations}</div>
                  <div style={styles.alertBox + { ...styles.alertRed }}>
                    {stats.slaViolations} card(s) vencido(s) e não concluído(s)
                  </div>
                </div>
              )}
              {stats.slaWarnings > 0 && (
                <div style={{ ...styles.card, borderLeft: "4px solid #f57c00" }}>
                  <div style={styles.cardTitle}>🟠 Avisos de SLA</div>
                  <div style={styles.cardValue}>{stats.slaWarnings}</div>
                  <div style={styles.alertBox + { ...styles.alertOrange }}>
                    {stats.slaWarnings} card(s) vence(m) nos próximos 3 dias
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Métricas Principais */}
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardTitle}>📈 Total de Cards</div>
              <div style={styles.cardValue}>{stats.total}</div>
              <div style={{ fontSize: "12px", color: "#6c65a7" }}>
                {stats.concluido} concluído(s), {stats.restante} em andamento
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>✅ Taxa de Conclusão</div>
              <div style={styles.cardValue}>{stats.ratio.toFixed(1)}%</div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${stats.ratio}%` }} />
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>🎯 Concluído</div>
              <div style={styles.cardValue}>{stats.concluido}</div>
              <div style={{ fontSize: "12px", color: "#4caf50", fontWeight: "600" }}>
                de {stats.total} cards
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardTitle}>⏳ Em Andamento</div>
              <div style={styles.cardValue}>{stats.restante}</div>
              <div style={{ fontSize: "12px", color: "#ff9800", fontWeight: "600" }}>
                {stats.total > 0 ? ((stats.restante / stats.total) * 100).toFixed(1) : "0"}% do total
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div style={styles.grid}>
            <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
              <div style={styles.cardTitle}>📊 Distribuição por Status</div>
              <div style={styles.chartRow}>
                {Object.entries(stats.statusBreakdown).map(([status, count]) => {
                  const labels = {
                    novo: "Novo",
                    analise: "Análise",
                    agendamento: "Agendamento",
                    agendado: "Agendado",
                    execucao: "Execução",
                    concluido: "Concluído",
                    inativo: "Inativo",
                  };
                  const colors = {
                    novo: "#9e9e9e",
                    analise: "#2196f3",
                    agendamento: "#ff9800",
                    agendado: "#673ab7",
                    execucao: "#f44336",
                    concluido: "#4caf50",
                    inativo: "#bdbdbd",
                  };
                  const maxHeight = 180;
                  const height = stats.total > 0 ? (count / stats.total) * maxHeight : 0;

                  return (
                    <div key={status} style={styles.chartBar}>
                      <div
                        style={{
                          ...styles.barFill,
                          height: `${Math.max(height, 4)}px`,
                          backgroundColor: colors[status],
                        }}
                      />
                      <div style={styles.barLabel}>
                        <div style={{ fontWeight: "700", fontSize: "12px" }}>{count}</div>
                        <div style={{ fontSize: "10px" }}>{labels[status]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Vendor Performance */}
          {stats.vendorStats.length > 0 && (
            <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
              <div style={styles.cardTitle}>👥 Performance por Vendedor</div>
              <div style={{ display: "grid", gap: "12px" }}>
                {stats.vendorStats
                  .sort((a, b) => b.ratio - a.ratio)
                  .map((vendor) => (
                    <div key={vendor.vendor} style={{ padding: "12px", backgroundColor: "#fafbff", borderRadius: "8px", borderLeft: "3px solid #8b64ff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ fontWeight: "600", color: "#3c2f9f" }}>{vendor.vendor}</div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#8b64ff" }}>
                          {vendor.completed}/{vendor.total} ({vendor.ratio.toFixed(0)}%)
                        </div>
                      </div>
                      <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: `${vendor.ratio}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}