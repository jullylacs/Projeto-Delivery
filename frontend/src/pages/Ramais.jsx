import { useState, useEffect } from "react";
import api from "../services/api";

const initials = (name) =>
  String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

const AVATAR_COLORS = [
  "#6c3bff", "#0e5a7a", "#1f7a3f", "#e8405a",
  "#ff9500", "#9b6dff", "#0e7a6b", "#7a2f8a",
];
const avatarColor = (name) =>
  AVATAR_COLORS[
    String(name || "")
      .split("")
      .reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  ];

export default function RamaisPage() {
  const [ramais, setRamais] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editRamal, setEditRamal] = useState("");
  const [editResponsavel, setEditResponsavel] = useState("");
  const [novoRamal, setNovoRamal] = useState("");
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState(null);

  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isGestorOuAdmin = ["admin", "gestor"].includes(user?.perfil);

  useEffect(() => {
    api.get("/ramais")
      .then((res) => setRamais(res.data))
      .catch(() => setRamais([]));
  }, []);

  async function adicionarRamal(e) {
    e.preventDefault();
    if (!novoRamal.trim() || !novoResponsavel.trim()) return;
    try {
      const res = await api.post("/ramais", {
        ramal: novoRamal.trim(),
        responsavel: novoResponsavel.trim(),
      });
      setRamais([...ramais, res.data]);
      setNovoRamal("");
      setNovoResponsavel("");
    } catch (err) {
      alert("Erro ao adicionar ramal: " + (err?.response?.data?.error || ""));
    }
  }

  function abrirModalEdicao(idx) {
    setEditIndex(idx);
    setEditRamal(ramais[idx].ramal);
    setEditResponsavel(ramais[idx].responsavel);
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    if (!editRamal.trim() || !editResponsavel.trim()) return;
    try {
      const id = ramais[editIndex].id;
      const res = await api.put(`/ramais/${id}`, {
        ramal: editRamal.trim(),
        responsavel: editResponsavel.trim(),
      });
      const novo = [...ramais];
      novo[editIndex] = res.data;
      setRamais(novo);
      setEditIndex(null);
    } catch (err) {
      alert("Erro ao editar ramal: " + (err?.response?.data?.error || ""));
    }
  }

  function fecharModal() {
    setEditIndex(null);
  }

  function copiarRamal(ramal) {
    navigator.clipboard.writeText(ramal).then(() => {
      setCopiado(ramal);
      setTimeout(() => setCopiado(null), 1500);
    });
  }

  const filtrados = ramais.filter(
    (r) =>
      r.ramal?.toLowerCase().includes(busca.toLowerCase()) ||
      r.responsavel?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ padding: "24px 28px", background: "var(--bg)", minHeight: "94vh", color: "var(--text)" }}>

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg, #6c3bff, #9b6dff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, boxShadow: "0 4px 16px rgba(108,59,255,0.35)",
          }}>
            ☎
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px" }}>
              Ramais
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#7264a8" }}>
              {ramais.length} contato{ramais.length !== 1 ? "s" : ""} cadastrado{ramais.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Busca */}
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
            color: "#9b8fd8", fontSize: 13, pointerEvents: "none",
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar ramal ou responsável..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              padding: "9px 14px 9px 34px",
              border: "1.5px solid #ddd5fc",
              borderRadius: 10,
              fontSize: 13,
              background: "var(--bg-card)",
              color: "var(--text)",
              width: 260,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Formulário de adição */}
      {isGestorOuAdmin && (
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid #ddd5fc",
          borderRadius: 16,
          padding: "16px 20px",
          boxShadow: "0 4px 20px rgba(90,60,180,0.08)",
          marginBottom: 24,
        }}>
          <p style={{ margin: "0 0 11px", fontSize: 11, fontWeight: 800, color: "#6b5ca8", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Novo ramal
          </p>
          <form onSubmit={adicionarRamal} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Número do ramal"
              value={novoRamal}
              onChange={(e) => setNovoRamal(e.target.value)}
              style={inputSt}
            />
            <input
              type="text"
              placeholder="Nome do responsável"
              value={novoResponsavel}
              onChange={(e) => setNovoResponsavel(e.target.value)}
              style={{ ...inputSt, flex: 2, minWidth: 160 }}
            />
            <button type="submit" style={addBtnSt}>
              + Adicionar
            </button>
          </form>
        </div>
      )}

      {/* Grid de cards */}
      {filtrados.length === 0 ? (
        <div style={{
          padding: "60px 24px",
          textAlign: "center",
          color: "#9b8fd8",
          background: "var(--bg-card)",
          borderRadius: 16,
          border: "1.5px dashed #ddd5fc",
        }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>📞</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "var(--text)" }}>
            {busca ? "Nenhum resultado encontrado" : "Nenhum ramal cadastrado"}
          </div>
          <div style={{ fontSize: 13, opacity: 0.65 }}>
            {busca ? `Sem resultados para "${busca}"` : "Adicione o primeiro ramal acima"}
          </div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 14,
        }}>
          {filtrados.map((r, i) => {
            const color = avatarColor(r.responsavel);
            const isCopied = copiado === r.ramal;
            return (
              <div
                key={r.id ?? i}
                className="ramal-card"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  padding: "22px 16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 2px 12px rgba(90,60,180,0.07)",
                  position: "relative",
                }}
              >
                {/* Ações no hover */}
                {isGestorOuAdmin && (
                  <div className="ramal-card-actions" style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 4 }}>
                    <button
                      className="ramal-btn-edit"
                      onClick={() => abrirModalEdicao(ramais.indexOf(r))}
                      title="Editar"
                      style={iconBtnEditSt}
                    >✏</button>
                    <button
                      className="ramal-btn-del"
                      onClick={async () => {
                        if (!window.confirm(`Excluir o ramal de ${r.responsavel}?`)) return;
                        try {
                          await api.delete(`/ramais/${r.id}`);
                          setRamais(ramais.filter((x) => x.id !== r.id));
                        } catch (err) {
                          alert("Erro ao excluir: " + (err?.response?.data?.error || ""));
                        }
                      }}
                      title="Excluir"
                      style={iconBtnDelSt}
                    >✕</button>
                  </div>
                )}

                {/* Avatar */}
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 800,
                  boxShadow: `0 6px 20px ${color}55`,
                  marginTop: 2,
                  flexShrink: 0,
                }}>
                  {initials(r.responsavel)}
                </div>

                {/* Nome */}
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text)",
                  textAlign: "center",
                  lineHeight: 1.3,
                  maxWidth: "100%",
                  wordBreak: "break-word",
                }}>
                  {r.responsavel}
                </div>

                {/* Ramal + copiar */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <a
                    href={`sip:${r.ramal}`}
                    title="Clique para ligar"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#6c3bff",
                      textDecoration: "none",
                      background: "#f0eaff",
                      borderRadius: 9,
                      padding: "5px 12px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    <span style={{ fontSize: 12 }}>✆</span>
                    {r.ramal}
                  </a>
                  <button
                    onClick={() => copiarRamal(r.ramal)}
                    title={isCopied ? "Copiado!" : "Copiar ramal"}
                    style={{
                      border: `1.5px solid ${isCopied ? "#a5d6a7" : "#ddd5fc"}`,
                      background: isCopied ? "#e8f5e9" : "var(--bg-card)",
                      color: isCopied ? "#2e7d32" : "#9b8fd8",
                      borderRadius: 8,
                      width: 30,
                      height: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: 13,
                      transition: "all 0.15s",
                      flexShrink: 0,
                    }}
                  >
                    {isCopied ? "✓" : "⎘"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de edição */}
      {editIndex !== null && (
        <div
          onMouseDown={(e) => { if (e.target === e.currentTarget) fecharModal(); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20, 8, 50, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1400,
            padding: 16,
          }}
        >
          <div style={{
            width: "min(420px, 100%)",
            background: "var(--bg-card)",
            borderRadius: 18,
            boxShadow: "0 32px 64px rgba(40,20,90,0.28)",
            overflow: "hidden",
          }}>
            <div style={{
              background: "linear-gradient(135deg, #5c2eff 0%, #8b5cff 100%)",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <strong style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>Editar Ramal</strong>
              <button
                onClick={fecharModal}
                style={{ background: "rgba(255,255,255,0.18)", border: "none", cursor: "pointer", color: "#fff", width: 30, height: 30, borderRadius: "50%", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            </div>

            <form onSubmit={salvarEdicao} style={{ display: "flex", flexDirection: "column", gap: 14, padding: "20px 22px 22px" }}>
              <div>
                <label style={labelSt}>Ramal</label>
                <input
                  type="text"
                  value={editRamal}
                  onChange={(e) => setEditRamal(e.target.value)}
                  placeholder="Número do ramal"
                  style={inputSt}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelSt}>Responsável</label>
                <input
                  type="text"
                  value={editResponsavel}
                  onChange={(e) => setEditResponsavel(e.target.value)}
                  placeholder="Nome do responsável"
                  style={inputSt}
                />
              </div>
              <div style={{ borderTop: "1px solid #f0eaff", paddingTop: 14, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={fecharModal}
                  style={{ border: "1.5px solid #d4c8fb", background: "#f6f2ff", color: "#4b2d84", padding: "9px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: "linear-gradient(135deg, #6c3bff 0%, #9b6dff 100%)", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, boxShadow: "0 3px 10px rgba(108,59,255,0.32)" }}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Estilos
// ===========================================================================

const inputSt = {
  flex: 1,
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid var(--border)",
  borderRadius: 10,
  fontSize: 13,
  background: "var(--bg-input)",
  color: "var(--text)",
  boxSizing: "border-box",
  outline: "none",
};

const addBtnSt = {
  padding: "10px 18px",
  background: "linear-gradient(135deg, #6c3bff 0%, #9b6dff 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13,
  boxShadow: "0 3px 10px rgba(108,59,255,0.32)",
  whiteSpace: "nowrap",
};

const iconBtnEditSt = {
  border: "1.5px solid #d4c8fb",
  background: "#f6f2ff",
  color: "#4b2d84",
  borderRadius: 7,
  width: 26,
  height: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  padding: 0,
};

const iconBtnDelSt = {
  border: "1.5px solid #ffc4cf",
  background: "#fff5f6",
  color: "#b00020",
  borderRadius: 7,
  width: 26,
  height: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  padding: 0,
};

const labelSt = {
  display: "block",
  fontSize: 10,
  color: "#6b5ca8",
  fontWeight: 800,
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
};
