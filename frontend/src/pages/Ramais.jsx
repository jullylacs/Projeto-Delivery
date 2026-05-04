import { useState, useEffect } from "react";
import api from "../services/api";

export default function RamaisPage() {
  const [ramais, setRamais] = useState([]);
  // Estado para modal de edição
  const [editIndex, setEditIndex] = useState(null);
  const [editRamal, setEditRamal] = useState("");
  const [editResponsavel, setEditResponsavel] = useState("");
  const [novoRamal, setNovoRamal] = useState("");
  const [novoResponsavel, setNovoResponsavel] = useState("");

  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isGestorOuAdmin = ["admin", "gestor"].includes(user?.perfil);

  // Buscar ramais ao carregar a página
  useEffect(() => {
    api.get("/ramais")
      .then(res => setRamais(res.data))
      .catch(() => setRamais([]));
  }, []);

  async function adicionarRamal(e) {
    e.preventDefault();
    if (!novoRamal.trim() || !novoResponsavel.trim()) return;
    try {
      const res = await api.post("/ramais", { ramal: novoRamal.trim(), responsavel: novoResponsavel.trim() });
      setRamais([...ramais, res.data]);
      setNovoRamal("");
      setNovoResponsavel("");
    } catch (err) {
      alert("Erro ao adicionar ramal: " + (err?.response?.data?.error || ""));
    }
  }

  // Função para abrir modal de edição
  function abrirModalEdicao(idx) {
    setEditIndex(idx);
    setEditRamal(ramais[idx].ramal);
    setEditResponsavel(ramais[idx].responsavel);
  }

  // Função para salvar edição
  async function salvarEdicao(e) {
    e.preventDefault();
    if (!editRamal.trim() || !editResponsavel.trim()) return;
    try {
      const id = ramais[editIndex].id;
      const res = await api.put(`/ramais/${id}`, { ramal: editRamal.trim(), responsavel: editResponsavel.trim() });
      const novo = [...ramais];
      novo[editIndex] = res.data;
      setRamais(novo);
      setEditIndex(null);
    } catch (err) {
      alert("Erro ao editar ramal: " + (err?.response?.data?.error || ""));
    }
  }

  // Função para fechar modal
  function fecharModal() {
    setEditIndex(null);
  }

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", background: "#fff", borderRadius: 16, boxShadow: "0 6px 32px #e6e0ff", padding: 48, position: "relative" }}>
      <h2 style={{ color: "#4b3b9a", marginBottom: 24 }}>Ramais e Responsáveis</h2>
      {isGestorOuAdmin && (
        <form onSubmit={adicionarRamal} style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Ramal"
            value={novoRamal}
            onChange={e => setNovoRamal(e.target.value)}
            style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #d6cfff" }}
          />
          <input
            type="text"
            placeholder="Responsável"
            value={novoResponsavel}
            onChange={e => setNovoResponsavel(e.target.value)}
            style={{ flex: 2, padding: 8, borderRadius: 6, border: "1px solid #d6cfff" }}
          />
          <button type="submit" style={{ background: "linear-gradient(90deg, #6c3bff 0%, #4b3b9a 100%)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, cursor: "pointer" }}>
            Adicionar
          </button>
        </form>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f8f6ff" }}>
            <th style={{ textAlign: "left", color: "#6c3bff", fontWeight: 700, padding: 8 }}>Ramal</th>
            <th style={{ textAlign: "left", color: "#6c3bff", fontWeight: 700, padding: 8 }}>Responsável</th>
            {isGestorOuAdmin && <th style={{ textAlign: "left", color: "#6c3bff", fontWeight: 700, padding: 8 }}>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {ramais.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ece3ff" }}>
              <td style={{ padding: 8, color: "#4b3b9a", fontWeight: 600, cursor: "pointer" }}
                  onClick={() => navigator.clipboard.writeText(r.ramal)}
                  title="Clique para copiar o ramal">
                {r.ramal}
              </td>
              <td style={{ padding: 8 }}>{r.responsavel}</td>
              {isGestorOuAdmin && (
                <td style={{ padding: 8 }}>
                  <button
                    style={{ background: "#fff0f6", color: "#d72660", border: "none", borderRadius: 6, padding: "4px 12px", cursor: "pointer", marginRight: 8 }}
                    onClick={async () => {
                      if (!window.confirm("Tem certeza que deseja excluir este ramal?")) return;
                      try {
                        const id = r.id;
                        await api.delete(`/ramais/${id}`);
                        setRamais(ramais.filter((_, idx) => idx !== i));
                      } catch (err) {
                        alert("Erro ao excluir ramal: " + (err?.response?.data?.error || ""));
                      }
                    }}
                  >Excluir</button>
                  <button
                    style={{ background: "#f3f0ff", color: "#4b3b9a", border: "none", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}
                    onClick={() => abrirModalEdicao(i)}
                  >Editar</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {/* Modal de edição */}
      {editIndex !== null && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <form onSubmit={salvarEdicao} style={{ background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px #e6e0ff", padding: 32, minWidth: 320, display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
            <h3 style={{ color: "#4b3b9a", margin: 0 }}>Editar Ramal</h3>
            <input
              type="text"
              value={editRamal}
              onChange={e => setEditRamal(e.target.value)}
              placeholder="Ramal"
              style={{ padding: 8, borderRadius: 6, border: "1px solid #d6cfff" }}
              autoFocus
            />
            <input
              type="text"
              value={editResponsavel}
              onChange={e => setEditResponsavel(e.target.value)}
              placeholder="Responsável"
              style={{ padding: 8, borderRadius: 6, border: "1px solid #d6cfff" }}
            />
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button type="button" onClick={fecharModal} style={{ background: "#ece3ff", color: "#4b3b9a", border: "none", borderRadius: 6, padding: "8px 18px", cursor: "pointer" }}>Cancelar</button>
              <button type="submit" style={{ background: "linear-gradient(90deg, #6c3bff 0%, #4b3b9a 100%)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontWeight: 700, cursor: "pointer" }}>Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
