import { useEffect, useRef, useState } from "react";
import api from "../services/api";

const SUGESTOES = [
  "Centro, Curitiba - PR",
  "Centro, São Paulo - SP",
  "Centro, Belo Horizonte - MG",
  "Centro, Florianópolis - SC",
];

const CORES_PROVEDOR = [
  "linear-gradient(135deg, #7a4dff, #c77dff)",
  "linear-gradient(135deg, #f72585, #b5179e)",
  "linear-gradient(135deg, #4cc9f0, #4361ee)",
  "linear-gradient(135deg, #f77f00, #fcbf49)",
  "linear-gradient(135deg, #2dc653, #52b788)",
  "linear-gradient(135deg, #e63946, #ff6b6b)",
];

function corProvedor(nome) {
  return CORES_PROVEDOR[(nome.charCodeAt(0) || 0) % CORES_PROVEDOR.length];
}

function parseResposta(texto) {
  if (!texto.includes("📡")) return { tipo: "texto", conteudo: texto };
  const idxPrimeiro = texto.indexOf("📡");
  const textoPre = texto.slice(0, idxPrimeiro).trim();
  const restante = texto.slice(idxPrimeiro);
  const blocos = restante.split(/(?=📡)/).filter((b) => b.trim());
  const provedores = blocos.map((bloco) => {
    const linhas = bloco.split("\n").filter((l) => l.trim());
    return {
      nome: linhas.find((l) => l.includes("📡"))?.replace("📡", "").replace(/\*\*/g, "").replace(/__/g, "").trim() || "",
      telefone: linhas.find((l) => l.includes("📞"))?.replace("📞", "").trim() || "",
      site: linhas.find((l) => l.includes("🌐"))?.replace("🌐", "").trim() || "",
      area: linhas.find((l) => l.includes("📍"))?.replace("📍", "").trim() || "",
    };
  }).filter((p) => p.nome);
  return provedores.length >= 1 ? { tipo: "provedores", textoPre, provedores } : { tipo: "texto", conteudo: texto };
}

export default function BuscarProvedores() {
  const [mensagens, setMensagens] = useState([]);
  const [historicoApi, setHistoricoApi] = useState([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [emChat, setEmChat] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const inputBoasVindasRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [mensagens, carregando]);

  async function enviar(textoOverride) {
    const texto = (textoOverride !== undefined ? textoOverride : input).trim();
    if (!texto || carregando) return;
    setEmChat(true);
    setMensagens((prev) => [...prev, { id: Date.now(), remetente: "usuario", texto }]);
    setInput("");
    setCarregando(true);
    try {
      const { data } = await api.post("/provedores/buscar", { mensagem: texto, historico: historicoApi });
      setMensagens((prev) => [...prev, { id: Date.now() + 1, remetente: "ia", texto: data.resposta }]);
      setHistoricoApi(data.historico);
    } catch (err) {
      const msg = err.response?.data?.message || "Erro ao buscar provedores. Tente novamente.";
      setMensagens((prev) => [...prev, { id: Date.now() + 1, remetente: "erro", texto: msg }]);
    } finally {
      setCarregando(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function limpar() {
    setMensagens([]);
    setHistoricoApi([]);
    setInput("");
    setEmChat(false);
    setTimeout(() => inputBoasVindasRef.current?.focus(), 100);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  }

  return (
    <>
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(122,77,255,0.5); }
          70% { transform: scale(1); box-shadow: 0 0 0 18px rgba(122,77,255,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(122,77,255,0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinRadar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .provider-card:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 10px 32px rgba(79,35,143,0.18) !important;
        }
        .sugestao-chip:hover {
          background: rgba(122,77,255,0.15) !important;
          border-color: #7a4dff !important;
          color: #5a2ddf !important;
        }
        .btn-buscar:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(122,77,255,0.55) !important;
        }
        .btn-copiar:hover { background: rgba(122,77,255,0.12) !important; }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column",
        height: "calc(100vh - 102px)", maxWidth: "860px",
        margin: "0 auto", borderRadius: "20px", overflow: "hidden",
        boxShadow: "0 8px 48px rgba(79,35,143,0.2)",
      }}>
        {emChat ? (
          <TelaChat
            mensagens={mensagens}
            carregando={carregando}
            input={input}
            setInput={setInput}
            onEnviar={enviar}
            onKeyDown={handleKeyDown}
            onLimpar={limpar}
            chatRef={chatRef}
            inputRef={inputRef}
          />
        ) : (
          <TelaBoasVindas
            input={input}
            setInput={setInput}
            onEnviar={enviar}
            onKeyDown={handleKeyDown}
            carregando={carregando}
            inputRef={inputBoasVindasRef}
          />
        )}
      </div>
    </>
  );
}

/* ───── TELA DE BOAS-VINDAS ───── */
function TelaBoasVindas({ input, setInput, onEnviar, onKeyDown, carregando, inputRef }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      background: "linear-gradient(160deg, #1a0535 0%, #2d0a5e 40%, #4a1a8a 75%, #6b2fa8 100%)",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px", gap: "32px",
    }}>
      {/* Ícone animado */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", animation: "fadeInUp 0.6s ease both" }}>
        <div style={{
          width: "88px", height: "88px", borderRadius: "24px",
          background: "linear-gradient(135deg, #7a4dff, #c77dff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "42px", animation: "pulseRing 2.4s ease-in-out infinite",
          boxShadow: "0 0 0 0 rgba(122,77,255,0.5)",
        }}>
          📡
        </div>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, color: "#fff", fontSize: "26px", fontWeight: "800", letterSpacing: "-0.5px", lineHeight: 1.2 }}>
            Buscar Provedores de Internet
          </h1>
          <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.6)", fontSize: "14.5px", lineHeight: 1.6 }}>
            Digite um endereço para encontrar provedores de internet<br />na região, ou tire qualquer dúvida.
          </p>
        </div>
      </div>

      {/* Caixa de busca */}
      <div style={{ width: "100%", maxWidth: "560px", animation: "fadeInUp 0.6s 0.1s ease both", opacity: 0 }}>
        <div style={{
          background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
          border: "1.5px solid rgba(255,255,255,0.18)", borderRadius: "16px",
          padding: "6px 6px 6px 18px",
          display: "flex", alignItems: "flex-end", gap: "8px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          <span style={{ fontSize: "20px", paddingBottom: "10px", flexShrink: 0 }}>🔍</span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={"Ex: Rua das Flores, 123, Centro, Curitiba - PR"}
            rows={2}
            disabled={carregando}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#fff", fontSize: "15px", resize: "none",
              fontFamily: "inherit", lineHeight: "1.5", paddingBottom: "10px",
            }}
          />
          <button
            className="btn-buscar"
            onClick={() => onEnviar()}
            disabled={carregando || !input.trim()}
            style={{
              background: !input.trim() || carregando
                ? "rgba(255,255,255,0.15)"
                : "linear-gradient(135deg, #7a4dff, #c77dff)",
              border: "none", borderRadius: "11px",
              color: "#fff", cursor: !input.trim() || carregando ? "not-allowed" : "pointer",
              padding: "10px 20px", fontSize: "14px", fontWeight: "700",
              flexShrink: 0, transition: "all 200ms ease",
              height: "44px", whiteSpace: "nowrap",
              boxShadow: input.trim() && !carregando ? "0 4px 16px rgba(122,77,255,0.45)" : "none",
            }}
          >
            {carregando ? "Buscando..." : "Buscar →"}
          </button>
        </div>

        {/* Sugestões */}
        <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
          {SUGESTOES.map((s) => (
            <button
              key={s}
              className="sugestao-chip"
              onClick={() => onEnviar(s)}
              style={{
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "20px", color: "rgba(255,255,255,0.75)",
                padding: "6px 14px", fontSize: "12.5px", cursor: "pointer",
                transition: "all 180ms ease", fontFamily: "inherit",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Rodapé informativo */}
      <div style={{
        display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center",
        animation: "fadeInUp 0.6s 0.2s ease both", opacity: 0,
      }}>
        {[["🔎", "Busca em tempo real"], ["📞", "Telefone confirmado"], ["🌐", "Site de contato"]].map(([icon, label]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "7px", color: "rgba(255,255,255,0.5)", fontSize: "12.5px" }}>
            <span>{icon}</span><span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───── TELA DE CHAT ───── */
function TelaChat({ mensagens, carregando, input, setInput, onEnviar, onKeyDown, onLimpar, chatRef, inputRef }) {
  return (
    <>
      {/* Header compacto */}
      <div style={{
        background: "linear-gradient(135deg, #1a0535 0%, #4a1a8a 100%)",
        padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px",
        flexShrink: 0, boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
      }}>
        <div style={{
          width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
          background: "linear-gradient(135deg, #7a4dff, #c77dff)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px",
          boxShadow: "0 4px 12px rgba(122,77,255,0.5)",
        }}>📡</div>
        <div>
          <div style={{ color: "#fff", fontWeight: "700", fontSize: "15px" }}>Buscar Provedores</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>Pesquisa em tempo real via Google</div>
        </div>
        <button
          onClick={onLimpar}
          style={{
            marginLeft: "auto", background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px",
            color: "rgba(255,255,255,0.8)", cursor: "pointer",
            padding: "6px 14px", fontSize: "12px", fontWeight: "500",
            transition: "all 180ms ease", fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
        >
          + Nova busca
        </button>
      </div>

      {/* Mensagens */}
      <div ref={chatRef} style={{
        flex: 1, overflowY: "auto", padding: "20px 18px",
        background: "linear-gradient(180deg, #f0ebff 0%, #ede8ff 100%)",
        display: "flex", flexDirection: "column", gap: "18px",
      }}>
        {mensagens.map((msg) => <MensagemBolha key={msg.id} msg={msg} />)}
        {carregando && <IndicadorCarregando />}
      </div>

      {/* Input */}
      <div style={{
        background: "#fff", padding: "14px 16px",
        borderTop: "1px solid #e4daf7",
        display: "flex", gap: "10px", alignItems: "flex-end",
        boxShadow: "0 -4px 16px rgba(79,35,143,0.07)", flexShrink: 0,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Digite um endereço ou faça uma pergunta de acompanhamento..."
          rows={2}
          disabled={carregando}
          style={{
            flex: 1, resize: "none", border: "1.5px solid #ddd5f7",
            borderRadius: "12px", padding: "10px 14px",
            fontSize: "13.5px", fontFamily: "inherit", outline: "none",
            lineHeight: 1.5, transition: "border-color 180ms ease",
            background: carregando ? "#faf8ff" : "#fff", color: "#1f2b46",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#7a4dff"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#ddd5f7"; }}
        />
        <button
          className="btn-buscar"
          onClick={() => onEnviar()}
          disabled={carregando || !input.trim()}
          style={{
            background: carregando || !input.trim()
              ? "#d9cff0"
              : "linear-gradient(135deg, #7a4dff, #c77dff)",
            border: "none", borderRadius: "12px",
            color: carregando || !input.trim() ? "#a090c8" : "#fff",
            cursor: carregando || !input.trim() ? "not-allowed" : "pointer",
            padding: "0 20px", fontSize: "14px", fontWeight: "700",
            height: "44px", flexShrink: 0, transition: "all 200ms ease",
            boxShadow: !carregando && input.trim() ? "0 4px 14px rgba(122,77,255,0.4)" : "none",
            fontFamily: "inherit",
          }}
        >
          {carregando ? "..." : "Enviar"}
        </button>
      </div>
    </>
  );
}

/* ───── BOLHA DE MENSAGEM ───── */
function MensagemBolha({ msg }) {
  const ehUsuario = msg.remetente === "usuario";
  const ehErro = msg.remetente === "erro";

  if (ehUsuario) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", alignItems: "flex-end", animation: "fadeInUp 0.25s ease both" }}>
        <div style={{
          maxWidth: "70%", background: "linear-gradient(135deg, #7a4dff, #9d6fff)",
          color: "#fff", borderRadius: "18px 4px 18px 18px",
          padding: "11px 16px", fontSize: "13.5px", lineHeight: 1.6,
          boxShadow: "0 4px 16px rgba(122,77,255,0.35)",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {msg.texto}
        </div>
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #3d1472, #7a4dff)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px",
          boxShadow: "0 2px 8px rgba(61,20,114,0.4)",
        }}>👩</div>
      </div>
    );
  }

  if (ehErro) {
    return (
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", animation: "fadeInUp 0.25s ease both" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #ff4d6d, #ff8fa3)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px",
          boxShadow: "0 2px 8px rgba(255,77,109,0.4)",
        }}>⚠️</div>
        <div style={{
          maxWidth: "75%", background: "#fff5f7",
          color: "#c0003c", borderRadius: "4px 18px 18px 18px",
          padding: "12px 16px", fontSize: "13.5px", lineHeight: 1.6,
          border: "1px solid #ffc0cc", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          {msg.texto}
        </div>
      </div>
    );
  }

  // Mensagem da IA — tenta parsear como provedores
  const parsed = parseResposta(msg.texto);
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", animation: "fadeInUp 0.3s ease both" }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #7a4dff, #c77dff)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px",
        boxShadow: "0 2px 8px rgba(122,77,255,0.4)", marginTop: "2px",
      }}>🤖</div>

      <div style={{ flex: 1, maxWidth: "85%" }}>
        {parsed.tipo === "provedores" ? (
          <RespostaProvedores textoPre={parsed.textoPre} provedores={parsed.provedores} />
        ) : (
          <div style={{
            background: "#fff", borderRadius: "4px 18px 18px 18px",
            padding: "12px 16px", fontSize: "13.5px", lineHeight: 1.65,
            color: "#1f2b46", whiteSpace: "pre-wrap", wordBreak: "break-word",
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          }}>
            {msg.texto}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── RESPOSTA COM CARDS DE PROVEDORES ───── */
function RespostaProvedores({ textoPre, provedores }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {textoPre && (
        <div style={{
          background: "#fff", borderRadius: "4px 18px 18px 18px",
          padding: "10px 14px", fontSize: "13px", color: "#5a4a7a",
          lineHeight: 1.6, boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}>
          {textoPre}
        </div>
      )}
      <div style={{ display: "grid", gap: "10px" }}>
        {provedores.map((p, i) => <CardProvedor key={i} provedor={p} indice={i} />)}
      </div>
    </div>
  );
}

/* ───── CARD DE PROVEDOR ───── */
function CardProvedor({ provedor, indice }) {
  const [copiado, setCopiado] = useState(false);

  function copiarTelefone() {
    navigator.clipboard.writeText(provedor.telefone).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  const inicial = provedor.nome.replace(/[^a-zA-Z]/g, "").charAt(0).toUpperCase() || "P";
  const cor = corProvedor(provedor.nome);

  return (
    <div
      className="provider-card"
      style={{
        background: "#fff",
        border: "1.5px solid #ece6ff",
        borderRadius: "16px",
        padding: "14px 16px",
        display: "flex",
        gap: "14px",
        alignItems: "flex-start",
        boxShadow: "0 3px 14px rgba(79,35,143,0.09)",
        transition: "all 220ms ease",
        animation: `fadeInUp 0.3s ${indice * 0.08}s ease both`,
        opacity: 0,
      }}
    >
      {/* Avatar */}
      <div style={{
        width: "44px", height: "44px", borderRadius: "12px",
        background: cor, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "18px", fontWeight: "800", flexShrink: 0,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}>
        {inicial}
      </div>

      {/* Dados */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: "700", fontSize: "14.5px", color: "#1f2b46", marginBottom: "8px", lineHeight: 1.3 }}>
          {provedor.nome}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {provedor.telefone && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px" }}>📞</span>
              <a href={`tel:${provedor.telefone.replace(/\D/g, "")}`} style={{
                fontSize: "13px", color: "#5a2ddf", textDecoration: "none", fontWeight: "500",
              }}>
                {provedor.telefone}
              </a>
              <button
                className="btn-copiar"
                onClick={copiarTelefone}
                title="Copiar número"
                style={{
                  background: "transparent", border: "1px solid #d4c5f0",
                  borderRadius: "6px", color: copiado ? "#2dc653" : "#7a4dff",
                  cursor: "pointer", padding: "1px 8px", fontSize: "11px",
                  fontWeight: "600", transition: "all 150ms ease", fontFamily: "inherit",
                }}
              >
                {copiado ? "✓ copiado" : "copiar"}
              </button>
            </div>
          )}
          {provedor.site && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
              <span style={{ fontSize: "13px" }}>🌐</span>
              <span style={{ fontSize: "13px", color: "#5a6470", lineHeight: 1.4, wordBreak: "break-word" }}>
                {provedor.site}
              </span>
            </div>
          )}
          {provedor.area && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
              <span style={{ fontSize: "13px" }}>📍</span>
              <span style={{ fontSize: "12.5px", color: "#8a8fa8", lineHeight: 1.4 }}>
                {provedor.area}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── INDICADOR DE CARREGAMENTO ───── */
function IndicadorCarregando() {
  const [fase, setFase] = useState(0);
  const fases = ["Pesquisando na internet", "Coletando dados dos provedores", "Verificando contatos"];

  useEffect(() => {
    const t = setInterval(() => setFase((f) => (f + 1) % fases.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #7a4dff, #c77dff)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px",
        boxShadow: "0 2px 8px rgba(122,77,255,0.4)",
        animation: "spinRadar 2s linear infinite",
      }}>📡</div>

      <div style={{
        background: "#fff", borderRadius: "4px 18px 18px 18px",
        padding: "13px 18px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        display: "flex", flexDirection: "column", gap: "8px", minWidth: "220px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", color: "#5a2ddf", fontWeight: "600" }}>
            {fases[fase]}...
          </span>
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              height: "3px", flex: 1, borderRadius: "2px",
              background: "linear-gradient(90deg, #7a4dff, #c77dff)",
              backgroundSize: "200% 100%",
              animation: `shimmer 1.5s ${i * 0.15}s linear infinite`,
              opacity: 0.7,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
