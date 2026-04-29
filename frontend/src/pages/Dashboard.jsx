// Importa hooks do React
import { useEffect, useMemo, useState, useRef } from "react";
// Importa serviço de API customizado
import api from "../services/api";
// Componente visual que indica SLA (tempo limite de cards)
import SLAIndicator from "../components/UI/SLAIndicator";

// Componente principal da página Dashboard
export default function Dashboard() {
  // Estado para armazenar os cards do Kanban
  const [cards, setCards] = useState([]);
  // Estado para armazenar as colunas reais do Kanban
  const [columns, setColumns] = useState([]);
  // Estado para armazenar todos os usuários
  const [users, setUsers] = useState([]);
  // Estado de carregamento inicial
  const [loading, setLoading] = useState(true);
  // Estado para armazenar mensagens de erro
  const [error, setError] = useState("");
  // Timer para atualização periódica
  const intervalRef = useRef(null);

  const loadingStyles = {
    container: {
      padding: "24px",
      background: "linear-gradient(180deg, #f8f7ff 0%, #f2f0ff 100%)",
      minHeight: "90vh",
    },
    card: {
      background: "#fff",
      border: "1px solid rgba(108,59,255,0.12)",
      borderRadius: "14px",
      padding: "18px",
      boxShadow: "0 8px 18px rgba(62,44,158,0.08)",
      marginBottom: "16px",
    },
    line: {
      height: "14px",
      borderRadius: "8px",
      background: "linear-gradient(90deg, #f1ecff 25%, #e8ddff 50%, #f1ecff 75%)",
      backgroundSize: "200% 100%",
      animation: "dashPulse 1.4s ease-in-out infinite",
      marginBottom: "10px",
    },
    title: {
      height: "28px",
      width: "260px",
      borderRadius: "10px",
      background: "linear-gradient(90deg, #f1ecff 25%, #e8ddff 50%, #f1ecff 75%)",
      backgroundSize: "200% 100%",
      animation: "dashPulse 1.4s ease-in-out infinite",
      marginBottom: "10px",
    },
    subtitle: {
      height: "14px",
      width: "420px",
      maxWidth: "100%",
      borderRadius: "8px",
      background: "linear-gradient(90deg, #f1ecff 25%, #e8ddff 50%, #f1ecff 75%)",
      backgroundSize: "200% 100%",
      animation: "dashPulse 1.4s ease-in-out infinite",
      marginBottom: "18px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: "16px",
    },
  };

  // Função para buscar cards, colunas e usuários
  const fetchData = async () => {
    try {
      setLoading(true);
      const [cardsRes, columnsRes, usersRes] = await Promise.all([
        api.get("/cards"),
        api.get("/columns"),
        api.get("/users/admin", { params: { limit: 200 } }),
      ]);
      setCards(cardsRes.data || []);
      // Ordena colunas por ordem (igual Kanban)
      const normalizedColumns = Array.isArray(columnsRes.data)
        ? [...columnsRes.data].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        : [];
      setColumns(normalizedColumns);
      // Suporta resposta paginada ou array direto
      const userRows = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.data || []);
      setUsers(userRows);
      setLoading(false);
    } catch (err) {
      setError("Não foi possível carregar os dados");
      setLoading(false);
      console.error(err);
    }
  };

  // useEffect para buscar dados na montagem e atualizar periodicamente
  useEffect(() => {
    fetchData();
    // Atualização automática a cada 10s
    intervalRef.current = setInterval(fetchData, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Calcula estatísticas dos cards e colunas de forma memoizada para performance
  const stats = useMemo(() => {
    const total = cards.length;
    const concluido = cards.filter((c) => c.status === "Concluído").length;
    const restante = total - concluido;
    const ratio = total > 0 ? (concluido / total) * 100 : 0;

    // Quebra por coluna real (sincronizado com Kanban, sem colunas fantasmas)
    const columnBreakdown = {};
    columns.forEach((col) => {
      columnBreakdown[col.nome] = cards.filter((c) => {
        if (c.coluna_id && col.id && Number(c.coluna_id) === Number(col.id)) return true;
        if (c.coluna && String(c.coluna).trim() === String(col.nome).trim()) return true;
        if (!c.coluna_id && !c.coluna && c.status && String(c.status).trim() === String(col.nome).trim()) return true;
        return false;
      }).length;
    });

    // SLA: alerta de prazos vencidos ou próximos
    const now = new Date();
    const slaViolations = cards.filter((c) => {
      if (!c.prazo || c.status === "Concluído" || c.status === "Inativo") return false;
      const deadline = new Date(c.prazo);
      return deadline < now;
    });
    const slaWarnings = cards.filter((c) => {
      if (!c.prazo || c.status === "Concluído" || c.status === "Inativo") return false;
      const deadline = new Date(c.prazo);
      const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 3;
    });

    // Performance por cargo (perfil)
    const usersByRole = {};
    users.forEach((user) => {
      const role = user.perfil?.trim() || "Sem cargo";
      if (!usersByRole[role]) usersByRole[role] = [];
      usersByRole[role].push(user);
    });

    // Para cada cargo, calcula stats dos usuários
    const roleStats = Object.entries(usersByRole).map(([role, roleUsers]) => {
      // Para cada usuário, calcula cards atribuídos e concluídos
      const userStats = roleUsers.map((user) => {
        const userCards = cards.filter((c) => {
          const vendedorId = c.vendedor?.id || c.vendedor_id || c.vendedorId;
          return String(vendedorId) === String(user.id);
        });
        const completed = userCards.filter((c) => c.status === "Concluído").length;
        return {
          user,
          total: userCards.length,
          completed,
          ratio: userCards.length > 0 ? (completed / userCards.length) * 100 : 0,
        };
      });
      // Estatísticas do cargo
      const totalCards = userStats.reduce((sum, u) => sum + u.total, 0);
      const totalCompleted = userStats.reduce((sum, u) => sum + u.completed, 0);
      return {
        role,
        users: userStats,
        totalCards,
        totalCompleted,
        ratio: totalCards > 0 ? (totalCompleted / totalCards) * 100 : 0,
      };
    });

    return {
      total,
      concluido,
      restante,
      ratio,
      columnBreakdown,
      slaViolations: slaViolations.length,
      slaWarnings: slaWarnings.length,
      roleStats,
    };
  }, [cards, columns, users]);

  // Renderiza loading enquanto dados são carregados
  if (loading) {
    return (
      <div style={loadingStyles.container}>
        <style>
          {`@keyframes dashPulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}
        </style>
        <div style={loadingStyles.title} />
        <div style={loadingStyles.subtitle} />

        <div style={loadingStyles.grid}>
          <div style={loadingStyles.card}>
            <div style={{ ...loadingStyles.line, width: "45%" }} />
            <div style={{ ...loadingStyles.line, height: "34px", width: "30%" }} />
            <div style={{ ...loadingStyles.line, width: "65%" }} />
          </div>
          <div style={loadingStyles.card}>
            <div style={{ ...loadingStyles.line, width: "52%" }} />
            <div style={{ ...loadingStyles.line, height: "34px", width: "28%" }} />
            <div style={{ ...loadingStyles.line, width: "75%" }} />
          </div>
          <div style={loadingStyles.card}>
            <div style={{ ...loadingStyles.line, width: "48%" }} />
            <div style={{ ...loadingStyles.line, height: "34px", width: "24%" }} />
            <div style={{ ...loadingStyles.line, width: "58%" }} />
          </div>
        </div>
      </div>
    );
  }

  // Estilos inline do dashboard
  const styles = {
    container: { padding: "24px", background: "linear-gradient(180deg, #f8f7ff 0%, #f2f0ff 100%)", minHeight: "90vh", color: "#1f2b46" },
    header: { marginBottom: "24px" },
    title: { margin: 0, color: "#3c2f9f", fontSize: "24px", fontWeight: "800" },
    subtitle: { color: "#5f5a88", fontSize: "14px", marginTop: "4px" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" },
    card: { background: "#fff", border: "1px solid rgba(108,59,255,0.12)", borderRadius: "14px", padding: "18px", boxShadow: "0 8px 18px rgba(62,44,158,0.08)" },
    cardTitle: { fontSize: "13px", fontWeight: "700", color: "#6c65a7", textTransform: "uppercase", marginBottom: "12px", letterSpacing: "0.5px" },
    cardValue: { fontSize: "32px", fontWeight: "800", color: "#3c2f9f", marginBottom: "8px" },
    alertBox: { padding: "12px", borderRadius: "8px", marginBottom: "8px", fontSize: "13px", fontWeight: "500" },
    alertRed: { backgroundColor: "#ffebee", borderLeft: "4px solid #d32f2f", color: "#c62828", paddingLeft: "12px" },
    alertOrange: { backgroundColor: "#f3edff", borderLeft: "4px solid #7b54e8", color: "#5f3fb8", paddingLeft: "12px" },
    chartRow: {
      display: "flex",
      flexWrap: "nowrap",
      alignItems: "flex-end",
      gap: "8px",
      padding: "16px 0",
      height: "220px",
      justifyContent: "space-between",
      overflowX: "hidden",
      width: "100%",
      maxWidth: "100%",
    },
    chartBar: {
      flex: "1 1 0%",
      minWidth: 0,
      maxWidth: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-end",
      background: "none",
    },
    barFill: { width: "100%", borderRadius: "12px 12px 0 0", transition: "height 0.3s ease", minHeight: "4px" },
    barLabel: { marginTop: "8px", fontSize: "11px", color: "#6c65a7", textAlign: "center", fontWeight: "500" },
    progressBar: { width: "100%", height: "8px", background: "#ebeaff", borderRadius: "4px", overflow: "hidden", marginTop: "8px" },
    progressFill: { height: "100%", background: "linear-gradient(90deg, #8b64ff, #5a30ff)", transition: "width 0.3s ease" },
  };

  return (
    <div style={styles.container}>
      {/* Cabeçalho do Dashboard */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Dashboard</h1>
        <p style={styles.subtitle}>Resumo de performance e alertas do sistema</p>
      </div>

      {/* Renderiza erro caso exista */}
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
                  <div style={{ ...styles.alertBox, ...styles.alertRed }}>
                    {stats.slaViolations} card(s) vencido(s) e não concluído(s)
                  </div>
                </div>
              )}
              {stats.slaWarnings > 0 && (
                <div style={{ ...styles.card, borderLeft: "4px solid #f57c00" }}>
                  <div style={styles.cardTitle}>🟠 Avisos de SLA</div>
                  <div style={styles.cardValue}>{stats.slaWarnings}</div>
                  <div style={{ ...styles.alertBox, ...styles.alertOrange }}>
                    {stats.slaWarnings} card(s) vence(m) nos próximos 3 dias
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Métricas principais */}
          <div style={styles.grid}>
            {/* Total de Cards */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>📈 Total de Cards</div>
              <div style={styles.cardValue}>{stats.total}</div>
              <div style={{ fontSize: "12px", color: "#6c65a7" }}>
                {stats.concluido} concluído(s), {stats.restante} em andamento
              </div>
            </div>

            {/* Taxa de conclusão */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>✅ Taxa de Conclusão</div>
              <div style={styles.cardValue}>{stats.ratio.toFixed(1)}%</div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${stats.ratio}%` }} />
              </div>
            </div>

            {/* Concluído */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>🎯 Concluído</div>
              <div style={styles.cardValue}>{stats.concluido}</div>
              <div style={{ fontSize: "12px", color: "#5a3fd0", fontWeight: "600" }}>
                de {stats.total} cards
              </div>
            </div>

            {/* Em andamento */}
            <div style={styles.card}>
              <div style={styles.cardTitle}>⏳ Em Andamento</div>
              <div style={styles.cardValue}>{stats.restante}</div>
              <div style={{ fontSize: "12px", color: "#7b54e8", fontWeight: "600" }}>
                {stats.total > 0 ? ((stats.restante / stats.total) * 100).toFixed(1) : "0"}% do total
              </div>
            </div>
          </div>

          {/* Distribuição por etapa (colunas reais do Kanban) */}
          <div style={styles.grid}>
            <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
              <div style={styles.cardTitle}>📊 Distribuição por Etapa (Kanban)</div>
              <div style={styles.chartRow}>
                {columns.map((col) => {
                  const count = stats.columnBreakdown[col.nome] || 0;
                  const maxHeight = 180;
                  const height = stats.total > 0 ? (count / stats.total) * maxHeight : 0;
                  // Cores dinâmicas (padrão, mas pode customizar por coluna)
                  const colorList = ["#8b64ff", "#7b54e8", "#673ab7", "#6a43d8", "#5a30ff", "#bdbdbd", "#9e9e9e", "#00b894", "#fdcb6e", "#e17055"];
                  const color = colorList[col.ordem % colorList.length] || "#8b64ff";
                  return (
                    <div key={col.id || col.nome} style={styles.chartBar}>
                      <div
                        style={{ ...styles.barFill, height: `${Math.max(height, 4)}px`, backgroundColor: color }}
                      />
                      <div style={styles.barLabel}>
                        <div style={{ fontWeight: "700", fontSize: "12px" }}>{count}</div>
                        <div style={{ fontSize: "10px" }}>{col.nome}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Performance geral por cargo (perfil) */}
          {stats.roleStats.length > 0 && (
            <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
              <div style={styles.cardTitle}>👥 Performance por Cargo</div>
              <div style={{ display: "grid", gap: "18px" }}>
                {stats.roleStats
                  .sort((a, b) => b.ratio - a.ratio)
                  .map((role) => (
                    <div key={role.role} style={{ padding: "14px 12px", backgroundColor: "#fafbff", borderRadius: "10px", borderLeft: "4px solid #8b64ff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <div style={{ fontWeight: "700", color: "#3c2f9f", fontSize: 15 }}>{role.role}</div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#8b64ff" }}>
                          {role.totalCompleted}/{role.totalCards} ({role.ratio.toFixed(0)}%)
                        </div>
                      </div>
                      <div style={styles.progressBar}>
                        <div style={{ ...styles.progressFill, width: `${role.ratio}%` }} />
                      </div>
                      <div style={{ marginTop: 10, fontSize: 13, color: '#5f5a88' }}>
                        <b>Equipe:</b>
                        <ul style={{ margin: '6px 0 0 0', padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          {role.users.map(u => (
                            <li key={u.user.id} style={{ minWidth: 180 }}>
                              <span style={{ fontWeight: 600, color: '#3c2f9f' }}>{u.user.nome}</span>
                              <span style={{ marginLeft: 8, color: '#8b64ff', fontWeight: 600 }}>{u.completed}/{u.total} ({u.ratio.toFixed(0)}%)</span>
                            </li>
                          ))}
                        </ul>
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