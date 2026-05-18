import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";

// Refresh automático a cada 3 minutos. Antes era 60s e ainda disparava o skeleton —
// ruim para UX. Agora o refetch é silencioso e só roda com a aba visível.
const REFRESH_INTERVAL_MS = 3 * 60 * 1000;

const COLOR_LIST = [
  "#8b64ff", "#7b54e8", "#673ab7", "#6a43d8", "#5a30ff",
  "#bdbdbd", "#9e9e9e", "#00b894", "#fdcb6e", "#e17055",
];

const loadingStyles = {
  container: { padding: "24px", background: "linear-gradient(180deg, #f8f7ff 0%, #f2f0ff 100%)", minHeight: "90vh" },
  card: { background: "#fff", border: "1px solid rgba(108,59,255,0.12)", borderRadius: "14px", padding: "18px", boxShadow: "0 8px 18px rgba(62,44,158,0.08)", marginBottom: "16px" },
  line: { height: "14px", borderRadius: "8px", background: "linear-gradient(90deg, #f1ecff 25%, #e8ddff 50%, #f1ecff 75%)", backgroundSize: "200% 100%", animation: "dashPulse 1.4s ease-in-out infinite", marginBottom: "10px" },
  title: { height: "28px", width: "260px", borderRadius: "10px", background: "linear-gradient(90deg, #f1ecff 25%, #e8ddff 50%, #f1ecff 75%)", backgroundSize: "200% 100%", animation: "dashPulse 1.4s ease-in-out infinite", marginBottom: "10px" },
  subtitle: { height: "14px", width: "420px", maxWidth: "100%", borderRadius: "8px", background: "linear-gradient(90deg, #f1ecff 25%, #e8ddff 50%, #f1ecff 75%)", backgroundSize: "200% 100%", animation: "dashPulse 1.4s ease-in-out infinite", marginBottom: "18px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" },
};

const styles = {
  container: { padding: "24px", background: "linear-gradient(180deg, #f8f7ff 0%, #f2f0ff 100%)", minHeight: "90vh", color: "#1f2b46" },
  header: { marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  title: { margin: 0, color: "#3c2f9f", fontSize: "24px", fontWeight: "800" },
  subtitle: { color: "#5f5a88", fontSize: "14px", marginTop: "4px" },
  refreshingBadge: { fontSize: 12, color: "#8b64ff", fontWeight: 700, opacity: 0.8 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" },
  card: { background: "#fff", border: "1px solid rgba(108,59,255,0.12)", borderRadius: "14px", padding: "18px", boxShadow: "0 8px 18px rgba(62,44,158,0.08)" },
  cardTitle: { fontSize: "13px", fontWeight: "700", color: "#6c65a7", textTransform: "uppercase", marginBottom: "12px", letterSpacing: "0.5px" },
  cardValue: { fontSize: "32px", fontWeight: "800", color: "#3c2f9f", marginBottom: "8px" },
  alertBox: { padding: "12px", borderRadius: "8px", marginBottom: "8px", fontSize: "13px", fontWeight: "500" },
  alertRed: { backgroundColor: "#ffebee", borderLeft: "4px solid #d32f2f", color: "#c62828", paddingLeft: "12px" },
  alertOrange: { backgroundColor: "#f3edff", borderLeft: "4px solid #7b54e8", color: "#5f3fb8", paddingLeft: "12px" },
  chartRow: { display: "flex", flexWrap: "nowrap", alignItems: "flex-end", gap: "8px", padding: "16px 0", height: "220px", justifyContent: "space-between", overflowX: "hidden", width: "100%", maxWidth: "100%" },
  chartBar: { flex: "1 1 0%", minWidth: 0, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", background: "none" },
  barFill: { width: "100%", borderRadius: "12px 12px 0 0", transition: "height 0.3s ease", minHeight: "4px" },
  barLabel: { marginTop: "8px", fontSize: "11px", color: "#6c65a7", textAlign: "center", fontWeight: "500" },
  progressBar: { width: "100%", height: "8px", background: "#ebeaff", borderRadius: "4px", overflow: "hidden", marginTop: "8px" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #8b64ff, #5a30ff)", transition: "width 0.3s ease" },
};

function DashboardSkeleton() {
  return (
    <div style={loadingStyles.container}>
      <style>{`@keyframes dashPulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={loadingStyles.title} />
      <div style={loadingStyles.subtitle} />
      <div style={loadingStyles.grid}>
        {[55, 65, 50].map((_, i) => (
          <div key={i} style={loadingStyles.card}>
            <div style={{ ...loadingStyles.line, width: `${45 + i * 3}%` }} />
            <div style={{ ...loadingStyles.line, height: "34px", width: `${30 - i * 2}%` }} />
            <div style={{ ...loadingStyles.line, width: `${65 + i * 5}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  // Refetch silencioso por padrão (não dispara skeleton).
  const fetchData = useCallback(async () => {
    if (!isFirstLoadRef.current) setIsRefreshing(true);
    try {
      const res = await api.get("/dashboard/summary");
      setData(res.data || null);
      setError("");
    } catch (err) {
      console.error(err);
      // Só substitui a tela por erro se nunca conseguimos carregar.
      if (isFirstLoadRef.current) setError("Não foi possível carregar os dados");
    } finally {
      isFirstLoadRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Refresh automático: só agenda quando a aba está visível, e pula refetch
    // se a aba estiver oculta. Economiza requests e CPU em background.
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      fetchData();
    };
    intervalRef.current = setInterval(tick, REFRESH_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchData]);

  if (isFirstLoadRef.current && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📊 Dashboard</h1>
        </div>
        <div style={{ color: "#a13333" }}>{error}</div>
      </div>
    );
  }

  const stats = data || {};
  const total = stats.total || 0;
  const concluido = stats.concluido || 0;
  const restante = stats.restante || 0;
  const ratio = stats.ratio || 0;
  const columnBreakdown = Array.isArray(stats.columnBreakdown) ? stats.columnBreakdown : [];
  const roleStats = Array.isArray(stats.roleStats) ? [...stats.roleStats].sort((a, b) => b.ratio - a.ratio) : [];
  const slaViolations = stats.slaViolations || 0;
  const slaWarnings = stats.slaWarnings || 0;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📊 Dashboard</h1>
          <p style={styles.subtitle}>Resumo de performance e alertas do sistema</p>
        </div>
        {isRefreshing && <span style={styles.refreshingBadge}>Atualizando…</span>}
      </div>

      {(slaViolations > 0 || slaWarnings > 0) && (
        <div style={styles.grid}>
          {slaViolations > 0 && (
            <div style={{ ...styles.card, borderLeft: "4px solid #d32f2f" }}>
              <div style={styles.cardTitle}>🔴 Violações de SLA</div>
              <div style={styles.cardValue}>{slaViolations}</div>
              <div style={{ ...styles.alertBox, ...styles.alertRed }}>
                {slaViolations} card(s) vencido(s) e não concluído(s)
              </div>
            </div>
          )}
          {slaWarnings > 0 && (
            <div style={{ ...styles.card, borderLeft: "4px solid #f57c00" }}>
              <div style={styles.cardTitle}>🟠 Avisos de SLA</div>
              <div style={styles.cardValue}>{slaWarnings}</div>
              <div style={{ ...styles.alertBox, ...styles.alertOrange }}>
                {slaWarnings} card(s) vence(m) nos próximos 3 dias
              </div>
            </div>
          )}
        </div>
      )}

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardTitle}>📈 Total de Cards</div>
          <div style={styles.cardValue}>{total}</div>
          <div style={{ fontSize: "12px", color: "#6c65a7" }}>
            {concluido} concluído(s), {restante} em andamento
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>✅ Taxa de Conclusão</div>
          <div style={styles.cardValue}>{ratio.toFixed(1)}%</div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${ratio}%` }} />
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>🎯 Concluído</div>
          <div style={styles.cardValue}>{concluido}</div>
          <div style={{ fontSize: "12px", color: "#5a3fd0", fontWeight: "600" }}>
            de {total} cards
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardTitle}>⏳ Em Andamento</div>
          <div style={styles.cardValue}>{restante}</div>
          <div style={{ fontSize: "12px", color: "#7b54e8", fontWeight: "600" }}>
            {total > 0 ? ((restante / total) * 100).toFixed(1) : "0"}% do total
          </div>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
          <div style={styles.cardTitle}>📊 Distribuição por Etapa (Kanban)</div>
          <div style={styles.chartRow}>
            {columnBreakdown.map((col) => {
              const count = col.count || 0;
              const maxHeight = 180;
              const height = total > 0 ? (count / total) * maxHeight : 0;
              const color = COLOR_LIST[(col.ordem || 0) % COLOR_LIST.length] || "#8b64ff";
              return (
                <div key={col.id || col.nome} style={styles.chartBar}>
                  <div style={{ ...styles.barFill, height: `${Math.max(height, 4)}px`, backgroundColor: color }} />
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

      {roleStats.length > 0 && (
        <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
          <div style={styles.cardTitle}>👥 Performance por Cargo</div>
          <div style={{ display: "grid", gap: "18px" }}>
            {roleStats.map((role) => (
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
                <div style={{ marginTop: 10, fontSize: 13, color: "#5f5a88" }}>
                  <b>Equipe:</b>
                  <ul style={{ margin: "6px 0 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {role.users.map((u) => (
                      <li key={u.id} style={{ minWidth: 180 }}>
                        <span style={{ fontWeight: 600, color: "#3c2f9f" }}>{u.nome}</span>
                        <span style={{ marginLeft: 8, color: "#8b64ff", fontWeight: 600 }}>
                          {u.completed}/{u.total} ({u.ratio.toFixed(0)}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
