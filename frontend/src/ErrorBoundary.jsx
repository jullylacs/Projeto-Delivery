import React from "react";

/**
 * ErrorBoundary — "circuit breaker" do React.
 * Captura erros em qualquer nó filho e exibe um fallback amigável
 * em vez de deixar a tela em branco ou travar o browser.
 *
 * Deve ser classe porque getDerivedStateFromError e componentDidCatch
 * ainda não têm equivalentes em hooks (React 19).
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary pegou um erro:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorScreen error={this.state.error} />;
    }
    return this.props.children;
  }
}

/* ── Tela de erro (componente funcional separado) ─────────────────────── */
function ErrorScreen({ error }) {
  const msg = error?.message || "";

  return (
    <>
      <style>{`
        @keyframes eb-float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes eb-fadein {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes eb-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
          50%       { box-shadow: 0 0 0 14px rgba(239,68,68,0); }
        }
        .eb-btn { transition: filter 0.15s, transform 0.15s; }
        .eb-btn:hover  { filter: brightness(1.12); transform: translateY(-2px) !important; }
        .eb-btn:active { filter: brightness(0.95); transform: translateY(0) !important; }
        .eb-secondary:hover { background: rgba(0,0,0,0.10) !important; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #f2efff)",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        padding: "24px",
        boxSizing: "border-box",
      }}>

        {/* Card principal */}
        <div style={{
          background: "var(--bg-card, #ffffff)",
          border: "1px solid var(--border, rgba(200,180,255,0.3))",
          borderRadius: 24,
          padding: "48px 40px 40px",
          maxWidth: 460,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(80,40,180,0.12), 0 4px 16px rgba(80,40,180,0.06)",
          animation: "eb-fadein 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
        }}>

          {/* Ícone animado */}
          <div style={{
            width: 90,
            height: 90,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #fff1f2, #fecdd3)",
            border: "2px solid #fca5a5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 28px",
            fontSize: 42,
            animation: "eb-float 3.5s ease-in-out infinite, eb-pulse 3s ease-in-out infinite",
          }}>
            💥
          </div>

          {/* Título */}
          <h1 style={{
            margin: "0 0 10px",
            fontSize: 26,
            fontWeight: 800,
            color: "var(--text, #1f2b46)",
            letterSpacing: "-0.4px",
            lineHeight: 1.2,
          }}>
            Algo deu errado
          </h1>

          {/* Descrição */}
          <p style={{
            margin: "0 0 6px",
            fontSize: 15,
            color: "var(--text-muted, #6b7280)",
            lineHeight: 1.6,
          }}>
            Ocorreu um erro inesperado na aplicação.
          </p>
          <p style={{
            margin: "0 0 28px",
            fontSize: 13.5,
            color: "var(--text-label, #9ca3af)",
            lineHeight: 1.5,
          }}>
            Recarregue a página ou volte ao início —{" "}
            <strong style={{ fontWeight: 600 }}>seus dados estão seguros</strong>.
          </p>

          {/* Detalhes técnicos — colapsável */}
          {msg && (
            <details style={{
              marginBottom: 24,
              textAlign: "left",
              background: "var(--bg-input, #faf7ff)",
              border: "1px solid var(--border, #e4dcff)",
              borderRadius: 10,
              padding: "10px 14px",
              cursor: "pointer",
            }}>
              <summary style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "var(--text-label, #9ca3af)",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                userSelect: "none",
                listStyle: "none",
              }}>
                ▸ Detalhes técnicos
              </summary>
              <pre style={{
                marginTop: 8,
                fontSize: 11.5,
                color: "#ef4444",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                lineHeight: 1.55,
                fontFamily: "'Fira Mono', 'Cascadia Code', 'Courier New', monospace",
                overflowX: "auto",
              }}>
                {msg}
              </pre>
            </details>
          )}

          {/* Botões de ação */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="eb-btn"
              onClick={() => window.location.reload()}
              style={{
                background: "linear-gradient(135deg, #ef4444, #f87171)",
                color: "#fff",
                border: "none",
                borderRadius: 11,
                padding: "11px 24px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
                letterSpacing: "0.1px",
              }}
            >
              🔄 Recarregar página
            </button>

            <button
              className="eb-btn eb-secondary"
              onClick={() => { window.location.href = "/"; }}
              style={{
                background: "var(--bg-input, rgba(0,0,0,0.05))",
                color: "var(--text-muted, #6b7280)",
                border: "1px solid var(--border, #e4dcff)",
                borderRadius: 11,
                padding: "11px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🏠 Ir para o início
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <p style={{
          marginTop: 22,
          fontSize: 12,
          color: "var(--text-label, #9ca3af)",
          opacity: 0.7,
        }}>
          NVX Networks · Se o problema persistir, contate o suporte.
        </p>
      </div>
    </>
  );
}
