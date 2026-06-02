import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

const BOARD_OPTIONS = [
  { value: "",          label: "Todos os boards" },
  { value: "comercial", label: "Comercial" },
  { value: "delivery",  label: "Delivery" },
  { value: "bko",       label: "BKO" },
];

const COLUMN_COLORS = [
  "#6c3bff", "#9b6dff", "#00b894", "#0e5a7a", "#ff9500",
  "#e8405a", "#1f7a3f", "#6b7a95", "#c77dff", "#fdcb6e",
];

const GREEN  = "#00b894";
const RED    = "#e8405a";
const ORANGE = "#ff9500";
const PURPLE = "#6c3bff";

// ===========================================================================
// Donut SVG nativo
// Fórmula: strokeDashoffset = C - prev (onde prev = comprimento acumulado)
// ===========================================================================
function DonutChart({ segments, size = 200, thickness = 34, label, subLabel }) {
  const cx = size / 2;
  const cy = size / 2;
  const r  = (size - thickness - 6) / 2;
  const C  = 2 * Math.PI * r;
  const total = segments.reduce((s, d) => s + d.value, 0);

  let prev = 0;

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {/* trilha de fundo */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0eaff" strokeWidth={thickness} />

      <g transform={`rotate(-90, ${cx}, ${cy})`}>
        {total > 0 && segments.map((seg, i) => {
          const segLen = (seg.value / total) * C;
          const offset = C - prev;
          prev += segLen;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={seg.fill}
              strokeWidth={thickness}
              strokeDasharray={`${segLen} ${C}`}
              strokeDashoffset={offset}
            >
              <title>{seg.name}: {seg.value}</title>
            </circle>
          );
        })}
      </g>

      {/* rótulo central */}
      {label && (
        <>
          <text x={cx} y={cy + 6} textAnchor="middle" dominantBaseline="middle"
            fill="#1a1535" fontSize={24} fontWeight={800}>{label}</text>
          {subLabel && (
            <text x={cx} y={cy + 26} textAnchor="middle"
              fill="#9b8fd8" fontSize={11} fontWeight={700}>{subLabel}</text>
          )}
        </>
      )}
    </svg>
  );
}


// ===========================================================================
// Skeleton de carregamento
// ===========================================================================
function LoadingSkeleton() {
  return (
    <div style={pg}>
      <style>{`@keyframes gPulse{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {[180, 320, 240].map((h, i) => (
        <div key={i} style={{ ...card, height: h, marginBottom: 16, background: "linear-gradient(90deg,#f1ecff 25%,#e8ddff 50%,#f1ecff 75%)", backgroundSize: "200% 100%", animation: "gPulse 1.4s ease-in-out infinite" }} />
      ))}
    </div>
  );
}

// ===========================================================================
// Componente principal
// ===========================================================================
export default function Graficos() {
  const [data,    setData]    = useState(null);
  const [board,   setBoard]   = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = board ? { board } : {};
      const res = await api.get("/dashboard/summary", { params });
      setData(res.data || null);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [board]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <LoadingSkeleton />;
  if (error || !data) {
    return (
      <div style={pg}>
        <p style={{ color: RED, fontWeight: 700 }}>{error || "Sem dados disponíveis."}</p>
      </div>
    );
  }

  const { total, concluido, restante, ratio, slaViolations, slaWarnings, columnBreakdown, roleStats } = data;

  // DEBUG — remover após confirmar o nome da coluna B2B
  console.log("[Graficos] columnBreakdown:", columnBreakdown.map((c) => `"${c.nome}" (${c.count})`).join(", "));

  // Cards que voltaram para B2B (colunas com "B2B" no nome)
  const b2bCount = columnBreakdown
    .filter((c) => c.nome.toUpperCase().includes("B2B"))
    .reduce((sum, c) => sum + c.count, 0);

  // Cards que voltaram para o Comercial (colunas com "comercial" no nome, excluindo "Concluído")
  const retornoComercialCount = columnBreakdown
    .filter((c) => c.nome.toLowerCase().includes("comercial") && !c.nome.toLowerCase().includes("conclu"))
    .reduce((sum, c) => sum + c.count, 0);

  const retornos = b2bCount + retornoComercialCount;

  // Segmentos do donut
  const donutSegments = [
    { name: "Concluído",          value: concluido,                                                          fill: GREEN    },
    { name: "Em andamento",       value: Math.max(0, restante - slaViolations - slaWarnings - retornos),     fill: PURPLE   },
    ...(retornoComercialCount > 0 ? [{ name: "Retorno Comercial", value: retornoComercialCount, fill: "#e67e22" }] : []),
    ...(b2bCount              > 0 ? [{ name: "Retorno B2B",       value: b2bCount,              fill: "#0e5a7a" }] : []),
    ...(slaWarnings           > 0 ? [{ name: "SLA alerta",        value: slaWarnings,           fill: ORANGE   }] : []),
    ...(slaViolations         > 0 ? [{ name: "SLA vencido",       value: slaViolations,         fill: RED      }] : []),
  ].filter((d) => d.value > 0);

  // Colunas com ao menos 1 card
  const colData      = columnBreakdown.filter((c) => c.count > 0);
  const maxColCount  = Math.max(...colData.map((c) => c.count), 1);

  const selectedLabel = BOARD_OPTIONS.find((b) => b.value === board)?.label || "Todos os boards";

  return (
    <div style={pg}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1535", letterSpacing: "-0.4px" }}>Gráficos</h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#7264a8" }}>
            {selectedLabel} · {total} cards no total
          </p>
        </div>
        <select value={board} onChange={(e) => setBoard(e.target.value)} style={selectSt}>
          {BOARD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Linha 1 — Donut + Barras verticais por coluna */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)", gap: 16, marginBottom: 16, alignItems: "start" }}>

        {/* Donut */}
        <div style={card}>
          <h3 style={ctitle}>Status geral</h3>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
            <DonutChart
              segments={donutSegments}
              size={260} thickness={44}
              label={`${ratio.toFixed(0)}%`}
              subLabel="conclusão"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", paddingBottom: 4 }}>
              {donutSegments.map((s) => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: s.fill, flexShrink: 0 }} />
                  <span style={{ color: "#4a3d7a", fontWeight: 600, flex: 1 }}>{s.name}</span>
                  <span style={{ fontWeight: 800, color: "#1a1535" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Barras verticais por coluna */}
        <div style={card}>
          <h3 style={ctitle}>Cards por coluna</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 340, paddingTop: 16 }}>
            {colData.map((col, i) => {
              const h    = Math.max(4, Math.round((col.count / maxColCount) * 270));
              const fill = COLUMN_COLORS[i % COLUMN_COLORS.length];
              return (
                <div
                  key={col.id}
                  style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}
                >
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#4a3d7a", marginBottom: 5 }}>{col.count}</span>
                  <div
                    title={`${col.nome}: ${col.count}`}
                    style={{
                      width: "100%", height: `${h}px`,
                      background: fill,
                      borderRadius: "7px 7px 0 0",
                      transition: "height 0.45s ease",
                      cursor: "default",
                    }}
                  />
                  <div style={{ marginTop: 7, fontSize: 10, color: "#7264a8", textAlign: "center", fontWeight: 600, lineHeight: 1.3, wordBreak: "break-word" }}>
                    {col.nome.length > 9 ? `${col.nome.slice(0, 8)}…` : col.nome}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

// ===========================================================================
// Estilos compartilhados
// ===========================================================================
const pg = {
  padding: "22px 24px",
  background: "linear-gradient(160deg, #f0ecff 0%, #eaf0ff 100%)",
  minHeight: "94vh",
  color: "#1a1535",
};

const card = {
  background: "#fff",
  border: "1px solid #ddd5fc",
  borderRadius: 16,
  padding: "18px 20px",
  boxShadow: "0 4px 20px rgba(90,60,180,0.08)",
};

const ctitle = {
  margin: "0 0 16px",
  fontSize: 13,
  fontWeight: 800,
  color: "#4a3d7a",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
};

const selectSt = {
  padding: "9px 14px",
  border: "1.5px solid #d0c4f8",
  borderRadius: 10,
  background: "rgba(255,255,255,0.9)",
  color: "#2f2758",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  outline: "none",
};
