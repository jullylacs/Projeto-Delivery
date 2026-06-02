import { useState, useEffect } from "react";
import api from "../services/api";

// Gera as iniciais do nome para o avatar
const initials = (name) =>
  String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

// Paleta de cores para avatares baseada no nome
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

  const filtrados = ramais.filter(
    (r) =>
      r.ramal?.toLowerCase().includes(busca.toLowerCase()) ||
      r.responsavel?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div style={{ padding: "22px 24px", background: "var(--bg)", minHeight: "94vh", color: "var(--text)" }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a1535", letterSpacing: "-0.4px" }}>
          Ramais
        </h2>
        <p style={{ margin: "3px 0 0", fontSize: 13, color: "#7264a8" }}>
          {ramais.length} contato{ramais.length !== 1 ? "s" : ""} cadastrado{ramais.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Formulário de adição */}
      {isGestorOuAdmin && (
        <div style={{ background: "#fff", border: "1px solid #ddd5fc", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 20px rgba(90,60,180,0.08)", marginBottom: 18 }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 800, color: "#6b5ca8", textTransform: "uppercase", letterSpacing: "0.6px" }}>
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

      {/* Busca */}
      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          placeholder="Buscar por ramal ou responsável..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            width: "100%",
            maxWidth: 380,
            padding: "9px 14px",
            border: "1.5px solid #ddd5fc",
            borderRadius: 10,
            fontSize: 13,
            background: "rgba(255,255,255,0.9)",
            color: "#2f2758",
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {/* Lista de contatos */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(90,60,180,0.08)" }}>
        {/* Cabeçalho da tabela */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isGestorOuAdmin ? "56px 1fr 1fr auto" : "56px 1fr 1fr",
          gap: 0,
          background: "linear-gradient(90deg, #f5f1ff 0%, #eff3ff 100%)",
          borderBottom: "1px solid #ede7ff",
          padding: "10px 20px",
        }}>
          <div />
          <div style={thSt}>Responsável</div>
          <div style={thSt}>Ramal</div>
          {isGestorOuAdmin && <div style={thSt}>Ações</div>}
        </div>

        {/* Linhas */}
        {filtrados.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "#9b8fd8", fontSize: 14, fontWeight: 600 }}>
            {busca ? "Nenhum resultado encontrado." : "Nenhum ramal cadastrado."}
          </div>
        ) : (
          filtrados.map((r, i) => (
            <div
              key={r.id ?? i}
              className="ramal-row"
              style={{
                display: "grid",
                gridTemplateColumns: isGestorOuAdmin ? "56px 1fr 1fr auto" : "56px 1fr 1fr",
                alignItems: "center",
                gap: 0,
                padding: "12px 20px",
                borderBottom: i < filtrados.length - 1 ? "1px solid #f0eaff" : "none",
                transition: "background 0.12s",
              }}
            >
              {/* Avatar */}
              <div>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: avatarColor(r.responsavel),
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  flexShrink: 0,
                }}>
                  {initials(r.responsavel)}
                </span>
              </div>

              {/* Responsável */}
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e2d4a" }}>
                {r.responsavel}
              </div>

              {/* Ramal com link SIP */}
              <div>
                <a
                  href={`sip:${r.ramal}`}
                  title="Clique para ligar"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#6c3bff",
                    textDecoration: "none",
                    background: "#f0eaff",
                    borderRadius: 8,
                    padding: "4px 10px",
                  }}
                >
                  <span style={{ fontSize: 12 }}>✆</span>
                  {r.ramal}
                </a>
              </div>

              {/* Ações */}
              {isGestorOuAdmin && (
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    className="ramal-btn-edit"
                    onClick={() => abrirModalEdicao(ramais.indexOf(r))}
                    style={editBtnSt}
                  >
                    Editar
                  </button>
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
                    style={delBtnSt}
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

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
            {/* Header colorido */}
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

const thSt = {
  fontSize: 10,
  color: "#7264a8",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.8px",
};

const editBtnSt = {
  fontSize: 12,
  fontWeight: 700,
  padding: "5px 12px",
  borderRadius: 8,
  border: "1.5px solid #d4c8fb",
  background: "#f6f2ff",
  color: "#4b2d84",
  cursor: "pointer",
};

const delBtnSt = {
  fontSize: 12,
  fontWeight: 700,
  padding: "5px 12px",
  borderRadius: 8,
  border: "1.5px solid #ffc4cf",
  background: "#fff5f6",
  color: "#b00020",
  cursor: "pointer",
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
