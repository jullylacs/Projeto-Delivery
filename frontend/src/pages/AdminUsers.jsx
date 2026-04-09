import { useEffect, useState } from "react";
import api from "../services/api";

const PERFIS = ["convidado", "comercial", "operacional", "tecnico", "delivery", "gestor", "admin"];
const PAGE_SIZE_OPTIONS = [8, 12, 20, 50];
const STORAGE_KEY = "adminUsersTableState";

const ROLE_STYLES = {
  admin: { bg: "#ffe9d6", fg: "#913400", label: "Admin" },
  gestor: { bg: "#e8ecff", fg: "#2f3d99", label: "Gestor" },
  tecnico: { bg: "#dff5ff", fg: "#0e5a7a", label: "Tecnico" },
  operacional: { bg: "#e9f8eb", fg: "#1c6d30", label: "Operacional" },
  delivery: { bg: "#fff0f6", fg: "#9b1b5a", label: "Delivery" },
  comercial: { bg: "#f6ecff", fg: "#6b2cb3", label: "Comercial" },
  convidado: { bg: "#fff4d9", fg: "#7a5b00", label: "Convidado" },
};

const APPROVAL_STYLES = {
  approved: { bg: "#e6f7ec", fg: "#1f6a2f", label: "Aprovado" },
  pending: { bg: "#fff4d9", fg: "#7a5b00", label: "Pendente" },
};

const styles = {
  container: {
    minHeight: "100%",
    padding: "24px",
    background: "radial-gradient(circle at 10% 10%, #f4edff 0%, #efe8ff 35%, #f8f5ff 100%)",
  },
  hero: {
    borderRadius: "18px",
    padding: "20px",
    border: "1px solid #ddd2ff",
    background: "linear-gradient(120deg, #3b126b 0%, #5f2ca0 45%, #7a50c6 100%)",
    color: "#fff",
    boxShadow: "0 12px 28px rgba(45, 18, 87, 0.26)",
    marginBottom: "16px",
  },
  title: { margin: 0, fontSize: "28px", letterSpacing: "0.2px" },
  subtitle: { margin: "8px 0 0 0", color: "#ece2ff", fontSize: "14px" },
  metricsRow: {
    marginTop: "14px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "10px",
  },
  metricCard: {
    borderRadius: "12px",
    padding: "12px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    transition: "transform .18s ease, box-shadow .18s ease",
  },
  metricLabel: { fontSize: "12px", color: "#efe6ff" },
  metricValue: { fontSize: "22px", fontWeight: 700, marginTop: "4px" },
  panel: {
    borderRadius: "16px",
    border: "1px solid #e2d9ff",
    background: "#ffffff",
    boxShadow: "0 8px 24px rgba(59, 18, 107, 0.08)",
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
    padding: "14px",
    background: "linear-gradient(180deg, #fcfbff 0%, #f8f5ff 100%)",
    borderBottom: "1px solid #eee8ff",
  },
  searchInput: {
    width: "340px",
    maxWidth: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #d7cafc",
    outline: "none",
    fontSize: "14px",
    background: "#fff",
  },
  pill: {
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 600,
    background: "#eee7ff",
    color: "#4b2d84",
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: {
    padding: "12px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 700,
    color: "#5f4e8f",
    background: "#f8f5ff",
    borderBottom: "1px solid #ece4ff",
    userSelect: "none",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #f1ecff",
    fontSize: "14px",
    color: "#2f2758",
    verticalAlign: "middle",
  },
  nameCell: { display: "flex", alignItems: "center", gap: "10px" },
  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(145deg, #7f5dff, #5d37d8)",
    color: "#fff",
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "0.3px",
  },
  badge: {
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 700,
    display: "inline-block",
  },
  actionBtn: {
    border: "1px solid #d4c8fb",
    background: "#faf7ff",
    color: "#4b2d84",
    borderRadius: "8px",
    padding: "7px 10px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "12px",
    transition: "transform .18s ease, box-shadow .18s ease, filter .18s ease",
  },
  saveBtn: {
    border: "1px solid #2f8a42",
    background: "#e8f9ee",
    color: "#1f6a2f",
    borderRadius: "8px",
    padding: "7px 10px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "12px",
    transition: "transform .18s ease, box-shadow .18s ease, filter .18s ease",
  },
  removeBtn: {
    border: "1px solid #ffb9c6",
    background: "#fff1f4",
    color: "#a4001d",
    borderRadius: "8px",
    padding: "7px 10px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "12px",
    transition: "transform .18s ease, box-shadow .18s ease, filter .18s ease",
  },
  input: {
    width: "100%",
    padding: "8px 9px",
    borderRadius: "8px",
    border: "1px solid #d9d0f9",
    fontSize: "13px",
    outline: "none",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    padding: "14px",
    background: "#fcfbff",
    borderTop: "1px solid #eee8ff",
  },
  paginationGroup: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" },
  pageBtn: {
    borderRadius: "8px",
    border: "1px solid #dacffd",
    background: "#fff",
    color: "#4d3681",
    padding: "7px 10px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    minWidth: "36px",
    transition: "transform .18s ease, box-shadow .18s ease, filter .18s ease",
  },
  activePageBtn: {
    borderColor: "#6f45e5",
    background: "linear-gradient(145deg, #7f5dff, #6f45e5)",
    color: "#fff",
  },
  loadingCard: {
    padding: 24,
    borderRadius: 16,
    background: "#ffffff",
    border: "1px solid #e4dcff",
    color: "#4b2d84",
    fontWeight: 600,
  },
  skeletonPulse: {
    background: "linear-gradient(90deg, #f1ecff 25%, #e8ddff 50%, #f1ecff 75%)",
    backgroundSize: "200% 100%",
    animation: "pulseShimmer 1.4s ease-in-out infinite",
    borderRadius: "10px",
  },
  error: {
    background: "#ffe8ec",
    border: "1px solid #ffb8c4",
    color: "#9c1f36",
    padding: "10px 12px",
    borderRadius: 10,
    margin: "0 14px 14px",
    fontSize: "13px",
  },
};

export default function AdminUsers() {
  // Estados da tabela de usuários
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [editingId, setEditingId] = useState(null); // ID do usuário em edição inline
  const [form, setForm] = useState({ nome: "", email: "", perfil: "convidado" });

  const totalFiltered = total;

  // Busca usuários da API com filtros de busca, paginação e ordenação
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        q: search,
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder,
      };

      if (showOnlyPending) {
        params.approved = false;
      }

      const res = await api.get("/users/admin", { params });

      if (Array.isArray(res.data)) {
        setUsers(res.data);
        setTotal(res.data.length);
        setTotalPages(1);
      } else {
        const rows = res.data.data || [];
        const serverTotalPages = res.data.pagination?.totalPages || 1;
        setUsers(rows);
        setTotal(res.data.pagination?.total || 0);
        setTotalPages(serverTotalPages);

        if (currentPage > serverTotalPages) {
          setCurrentPage(serverTotalPages);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Não foi possível carregar os usuários");
    } finally {
      setLoading(false);
    }
  };

  // Restaura estado (filtros, página, ordenação) do localStorage ao montar o componente
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.search === "string") setSearch(parsed.search);
      if (Number.isInteger(parsed.currentPage) && parsed.currentPage > 0) setCurrentPage(parsed.currentPage);
      if (Number.isInteger(parsed.pageSize) && PAGE_SIZE_OPTIONS.includes(parsed.pageSize)) setPageSize(parsed.pageSize);
      if (typeof parsed.sortBy === "string") setSortBy(parsed.sortBy);
      if (parsed.sortOrder === "asc" || parsed.sortOrder === "desc") setSortOrder(parsed.sortOrder);
      if (typeof parsed.showOnlyPending === "boolean") setShowOnlyPending(parsed.showOnlyPending);
    } catch {
      // Ignora estado inválido salvo no navegador.
    }
  }, []);

  // Persiste estado atual no localStorage sempre que os filtros ou página mudam
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        search,
        currentPage,
        pageSize,
        sortBy,
        sortOrder,
        showOnlyPending,
      })
    );
  }, [search, currentPage, pageSize, sortBy, sortOrder, showOnlyPending]);

  // Atualiza campo de busca e volta para a primeira página
  const handleSearchChange = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  // Navega para a página indicada, validando os limites
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Altera o número de itens por página e volta para a primeira página
  const handlePageSizeChange = (value) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const handleTogglePendingFilter = () => {
    setShowOnlyPending((prev) => !prev);
    setCurrentPage(1);
  };

  // Alterna ordenação: ao clicar na mesma coluna, inverte asc/desc; em nova coluna, inicia com asc
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(column);
    setSortOrder("asc");
  };

  // Retorna o indicador visual de ordenação (▲ ou ▼) para a coluna ativa
  const sortIndicator = (column) => {
    if (sortBy !== column) return "";
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  // Extrai as iniciais do nome do usuário para o avatar
  const getUserInitials = (user) => {
    const name = String(user?.nome || "").trim();
    if (!name) return "US";
    const parts = name.split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "U";
    const second = parts[1]?.[0] || parts[0]?.[1] || "S";
    return `${first}${second}`.toUpperCase();
  };

  // Retorna o estilo (cor de fundo + texto) do badge de perfil
  const getRoleStyle = (role) => ROLE_STYLES[role] || ROLE_STYLES.comercial;

  // Aplica efeito de hover nos botões de ação
  const handleButtonHoverIn = (event) => {
    event.currentTarget.style.transform = "translateY(-1px)";
    event.currentTarget.style.boxShadow = "0 6px 14px rgba(76, 45, 132, 0.16)";
    event.currentTarget.style.filter = "brightness(1.02)";
  };

  // Remove o efeito de hover dos botões de ação
  const handleButtonHoverOut = (event) => {
    event.currentTarget.style.transform = "translateY(0)";
    event.currentTarget.style.boxShadow = "none";
    event.currentTarget.style.filter = "none";
  };

  useEffect(() => {
    loadUsers();
  }, [search, currentPage, pageSize, sortBy, sortOrder, showOnlyPending]);

  // Inicia o modo de edição inline de um usuário e carrega os dados no formulário
  const startEdit = (user) => {
    setEditingId(user.id);
    setForm({
      nome: user.nome || "",
      email: user.email || "",
      perfil: user.perfil || "convidado",
    });
  };

  // Cancela a edição e limpa o formulário
  const cancelEdit = () => {
    setEditingId(null);
    setForm({ nome: "", email: "", perfil: "convidado" });
  };

  // Envia as alterações do formulário para a API e recarrega a tabela
  const saveEdit = async (id) => {
    try {
      await api.put(`/users/admin/${id}`, form);
      await loadUsers();
      cancelEdit();
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao salvar alterações");
    }
  };

  const approveUser = async (id) => {
    try {
      await api.patch(`/users/admin/${id}/approve`);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao aprovar usuário");
    }
  };

  const approveAllUsers = async () => {
    const confirmed = window.confirm("Deseja aprovar todos os usuários pendentes?");
    if (!confirmed) return;

    try {
      setIsApprovingAll(true);
      setError("");
      const res = await api.patch("/users/admin/approve-all");
      await loadUsers();
      const updated = Number(res?.data?.updated || 0);
      if (updated === 0) {
        setError("Nenhum usuário pendente para aprovar.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao aprovar todos os usuários");
    } finally {
      setIsApprovingAll(false);
    }
  };

  // Confirma e exclui o usuário selecionado via API
  const deleteUser = async (id) => {
    const confirmed = window.confirm("Tem certeza que deseja excluir este usuário?");
    if (!confirmed) return;

    try {
      await api.delete(`/users/admin/${id}`);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao excluir usuário");
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <style>
          {`@keyframes pulseShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}
        </style>
        <div style={styles.loadingCard}>
          <div style={{ ...styles.skeletonPulse, height: 28, width: "36%", marginBottom: 14 }} />
          <div style={{ ...styles.skeletonPulse, height: 16, width: "60%", marginBottom: 18 }} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            <div style={{ ...styles.skeletonPulse, height: 74 }} />
            <div style={{ ...styles.skeletonPulse, height: 74 }} />
            <div style={{ ...styles.skeletonPulse, height: 74 }} />
          </div>

          <div style={{ ...styles.skeletonPulse, height: 42, marginBottom: 10 }} />
          <div style={{ ...styles.skeletonPulse, height: 42, marginBottom: 8 }} />
          <div style={{ ...styles.skeletonPulse, height: 42, marginBottom: 8 }} />
          <div style={{ ...styles.skeletonPulse, height: 42, marginBottom: 8 }} />
          <div style={{ ...styles.skeletonPulse, height: 42 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <section style={styles.hero}>
        <h1 style={styles.title}>Painel de Usuarios</h1>
        <p style={styles.subtitle}>Gestao centralizada de contas, perfis e permissoes administrativas.</p>
        <div style={styles.metricsRow}>
          <div
            style={styles.metricCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 20px rgba(30, 12, 62, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={styles.metricLabel}>Total de Usuarios</div>
            <div style={styles.metricValue}>{total}</div>
          </div>
          <div
            style={styles.metricCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 20px rgba(30, 12, 62, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={styles.metricLabel}>Pagina Atual</div>
            <div style={styles.metricValue}>{currentPage}</div>
          </div>
          <div
            style={styles.metricCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 10px 20px rgba(30, 12, 62, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={styles.metricLabel}>Paginas Disponiveis</div>
            <div style={styles.metricValue}>{totalPages}</div>
          </div>
        </div>
      </section>

      <section style={styles.panel}>
      <div style={styles.toolbar}>
        <input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar por nome ou email"
          style={styles.searchInput}
        />
        <span style={styles.pill}>
          Exibindo {totalFiltered} resultado(s)
        </span>
        <label style={styles.pill}>
          Itens por pagina:{" "}
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(e.target.value)}
            style={{
              marginLeft: 8,
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid #d1c4fa",
              background: "#fff",
              color: "#4b2d84",
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          style={{
            ...styles.actionBtn,
            borderColor: showOnlyPending ? "#7f5dff" : "#d4c8fb",
            background: showOnlyPending ? "#efe8ff" : "#faf7ff",
          }}
          onClick={handleTogglePendingFilter}
          onMouseEnter={handleButtonHoverIn}
          onMouseLeave={handleButtonHoverOut}
        >
          {showOnlyPending ? "Mostrando pendentes" : "Filtrar não aprovados"}
        </button>
        <button
          type="button"
          style={{
            ...styles.saveBtn,
            opacity: isApprovingAll ? 0.7 : 1,
            cursor: isApprovingAll ? "wait" : "pointer",
          }}
          onClick={approveAllUsers}
          disabled={isApprovingAll}
          onMouseEnter={handleButtonHoverIn}
          onMouseLeave={handleButtonHoverOut}
        >
          {isApprovingAll ? "Aprovando..." : "Aprovar todos"}
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, cursor: "pointer" }} onClick={() => handleSort("id")}>
                ID{sortIndicator("id")}
              </th>
              <th style={{ ...styles.th, cursor: "pointer" }} onClick={() => handleSort("nome")}>
                Nome{sortIndicator("nome")}
              </th>
              <th style={{ ...styles.th, cursor: "pointer" }} onClick={() => handleSort("email")}>
                Email{sortIndicator("email")}
              </th>
              <th style={{ ...styles.th, cursor: "pointer" }} onClick={() => handleSort("perfil")}>
                Perfil{sortIndicator("perfil")}
              </th>
              <th style={{ ...styles.th, cursor: "pointer" }} onClick={() => handleSort("aprovado")}>
                Aprovacao{sortIndicator("aprovado")}
              </th>
              <th style={styles.th}>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const editing = editingId === user.id;
              const roleStyle = getRoleStyle(user.perfil);
              const approvalStyle = user.aprovado ? APPROVAL_STYLES.approved : APPROVAL_STYLES.pending;

              return (
                <tr
                  key={user.id}
                  onMouseEnter={() => setHoveredRowId(user.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  style={{
                    background: hoveredRowId === user.id ? "#fcf9ff" : "#fff",
                    transition: "background-color .18s ease",
                  }}
                >
                  <td style={styles.td}>#{user.id}</td>
                  <td style={styles.td}>
                    {editing ? (
                      <input
                        value={form.nome}
                        onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                        style={styles.input}
                      />
                    ) : (
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>{getUserInitials(user)}</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{user.nome}</div>
                          <div style={{ fontSize: "12px", color: "#7a73a1" }}>usuario ativo</div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    {editing ? (
                      <input
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        style={styles.input}
                      />
                    ) : (
                      <span style={{ color: "#5d5890", fontWeight: 600 }}>{user.email}</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {editing ? (
                      <select
                        value={form.perfil}
                        onChange={(e) => setForm((p) => ({ ...p, perfil: e.target.value }))}
                        style={styles.input}
                      >
                        {PERFIS.map((perfil) => (
                          <option key={perfil} value={perfil}>
                            {perfil}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ ...styles.badge, background: roleStyle.bg, color: roleStyle.fg }}>
                        {roleStyle.label}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: approvalStyle.bg, color: approvalStyle.fg }}>
                      {approvalStyle.label}
                    </span>
                  </td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    {editing ? (
                      <>
                        <button style={styles.saveBtn} onClick={() => saveEdit(user.id)} onMouseEnter={handleButtonHoverIn} onMouseLeave={handleButtonHoverOut}>Salvar</button>
                        <button style={styles.actionBtn} onClick={cancelEdit} onMouseEnter={handleButtonHoverIn} onMouseLeave={handleButtonHoverOut}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        {!user.aprovado && (
                          <button style={styles.saveBtn} onClick={() => approveUser(user.id)} onMouseEnter={handleButtonHoverIn} onMouseLeave={handleButtonHoverOut}>
                            Aprovar
                          </button>
                        )}
                        <button style={styles.actionBtn} onClick={() => startEdit(user)} onMouseEnter={handleButtonHoverIn} onMouseLeave={handleButtonHoverOut}>Editar</button>
                        <button style={styles.removeBtn} onClick={() => deleteUser(user.id)} onMouseEnter={handleButtonHoverIn} onMouseLeave={handleButtonHoverOut}>
                          Excluir
                        </button>
                      </>
                    )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...styles.td, textAlign: "center", color: "#6a6791" }}>
                  Nenhum usuário encontrado para a busca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.footer}>
        <span style={{ color: "#6a6791", fontSize: "13px" }}>
          Pagina {currentPage} de {totalPages}
        </span>
        <div style={styles.paginationGroup}>
        <button style={styles.pageBtn} onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} onMouseEnter={handleButtonHoverIn} onMouseLeave={handleButtonHoverOut}>
          Anterior
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => goToPage(page)}
            onMouseEnter={handleButtonHoverIn}
            onMouseLeave={handleButtonHoverOut}
            style={{
              ...styles.pageBtn,
              ...(page === currentPage ? styles.activePageBtn : {}),
            }}
          >
            {page}
          </button>
        ))}
        <button style={styles.pageBtn} onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} onMouseEnter={handleButtonHoverIn} onMouseLeave={handleButtonHoverOut}>
          Próxima
        </button>
        </div>
      </div>
      </section>
    </div>
  );
}
