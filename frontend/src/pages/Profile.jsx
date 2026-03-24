import { useEffect, useState } from "react"; // Hooks do React
import { useNavigate } from "react-router-dom"; // Hook para navegação programática
import api from "../services/api"; // Instância de API configurada para comunicação com backend

export default function Profile() {
  // Estados do componente
  const [user, setUser] = useState(null); // Armazena dados do usuário
  const [loading, setLoading] = useState(true); // Indica se o perfil está sendo carregado
  const [isEditing, setIsEditing] = useState(false); // Define se o usuário está no modo de edição
  const [formData, setFormData] = useState({}); // Armazena dados do formulário enquanto edita
  const [avatarPreview, setAvatarPreview] = useState(null); // Armazena preview do avatar
  const [error, setError] = useState(""); // Mensagem de erro
  const navigate = useNavigate(); // Hook para navegação programática

  // Carrega perfil do usuário ao montar o componente
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}"); // Busca dados do usuário no localStorage

    if (!userData._id) {
      navigate("/login"); // Se não tiver usuário, redireciona para login
      return;
    }

    fetchUserProfile(userData._id); // Busca perfil do usuário no backend
  }, [navigate]);

  // Função para buscar perfil do usuário pelo ID
  const fetchUserProfile = async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`); // Requisição GET para backend
      setUser(response.data); // Salva dados do usuário
      setFormData(response.data); // Preenche formulário com os dados atuais
      setAvatarPreview(response.data.avatar); // Define avatar
      setLoading(false); // Desativa loading
    } catch (err) {
      console.error("Erro ao buscar perfil:", err); // Loga erro
      setError("Erro ao carregar perfil"); // Mostra mensagem de erro
      setLoading(false); // Desativa loading
    }
  };

  // Atualiza valores do formulário conforme usuário digita
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value // Atualiza o campo específico do formulário
    }));
    setError(""); // Limpa erro ao digitar
  };

  // Função para alterar avatar com preview
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]; // Pega arquivo selecionado
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result); // Atualiza preview
        setFormData(prev => ({
          ...prev,
          avatar: reader.result // Salva avatar em base64 no formulário
        }));
      };
      reader.readAsDataURL(file); // Converte arquivo para base64
    }
  };

  // Salva alterações do perfil no backend
  const handleSaveProfile = async () => {
    try {
      const response = await api.put(`/users/${user._id}`, formData); // Requisição PUT para atualizar perfil
      setUser(response.data); // Atualiza estado do usuário
      localStorage.setItem("user", JSON.stringify(response.data)); // Atualiza localStorage
      setIsEditing(false); // Sai do modo edição
      setError(""); // Limpa erro
      alert("Perfil atualizado com sucesso!"); // Alerta de sucesso
    } catch (err) {
      setError("Erro ao atualizar perfil: " + (err.response?.data?.message || err.message)); // Mostra erro detalhado
    }
  };

  // Objetos de perfis com label e cor para visualização
  const perfis = {
    comercial: { label: "👔 Comercial", color: "#1e40af" },
    operacional: { label: "📋 Operacional", color: "#059669" },
    tecnico: { label: "🔧 Técnico", color: "#d97706" },
    gestor: { label: "👨‍💼 Gestor", color: "#7c3aed" },
    delivery: { label: "🚚 Delivery", color: "#0ea5e9" },
    admin: { label: "🔐 Admin", color: "#dc2626" }
  };

  // Renderiza loading enquanto busca dados
  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#666" }}>
        Carregando perfil...
      </div>
    );
  }

  // Caso não tenha usuário carregado, mostra erro
  if (!user) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#d32f2f" }}>
        Erro ao carregar perfil
      </div>
    );
  }

  // Renderização principal do componente
  return (
    <div style={{
      padding: "24px",
      background: "linear-gradient(180deg, #f8f7ff 0%, #f2f0ff 100%)",
      minHeight: "90vh"
    }}>
      <div style={{
        maxWidth: "600px",
        margin: "0 auto"
      }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ margin: 0, color: "#3c2f9f", fontSize: "28px" }}>👤 Meu Perfil</h1>
          <p style={{ color: "#5f5a88", fontSize: "14px", marginTop: "4px" }}>
            Visualize e edite suas informações
          </p>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div style={{
            padding: "12px 16px",
            backgroundColor: "#ffebee",
            border: "1px solid #ef5350",
            borderRadius: "8px",
            color: "#c62828",
            marginBottom: "16px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        {/* Card de perfil */}
        <div style={{
          backgroundColor: "#fff",
          border: "1px solid rgba(108,59,255,0.12)",
          borderRadius: "14px",
          padding: "32px",
          boxShadow: "0 8px 18px rgba(62,44,158,0.08)"
        }}>
          {/* Avatar */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "28px",
            paddingBottom: "20px",
            borderBottom: "1px solid #e0e0e0"
          }}>
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              backgroundColor: avatarPreview ? "transparent" : "#8b64ff", // Cor padrão se não tiver avatar
              backgroundImage: avatarPreview ? `url(${avatarPreview})` : "none", // Imagem do avatar
              backgroundSize: "cover",
              backgroundPosition: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
              marginBottom: "16px",
              border: "4px solid #e0e0e0",
              boxShadow: "0 4px 12px rgba(62,44,158,0.15)"
            }}>
              {!avatarPreview && "👤"} {/* Emoji padrão */}
            </div>

            {/* Botão para alterar avatar */}
            {isEditing && (
              <label style={{
                padding: "8px 16px",
                backgroundColor: "#8b64ff",
                color: "#fff",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                marginBottom: "12px"
              }}>
                📸 Mudar Foto
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }} // input escondido
                />
              </label>
            )}

            {/* Nome e perfil */}
            <h2 style={{ margin: "0 0 8px 0", color: "#3c2f9f", fontSize: "20px" }}>
              {user.nome}
            </h2>
            <span style={{
              display: "inline-block",
              padding: "6px 12px",
              backgroundColor: perfis[user.perfil]?.color || "#999",
              color: "#fff",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600"
            }}>
              {perfis[user.perfil]?.label || user.perfil}
            </span>
          </div>

          {/* Informações */}
          <div style={{ display: "grid", gap: "16px" }}>
            {/* Nome */}
            <div>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "700",
                color: "#6c65a7",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Nome Completo
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="nome"
                  value={formData.nome || ""}
                  onChange={handleChange} // Atualiza estado do form
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d6d0ff",
                    borderRadius: "8px",
                    backgroundColor: "#faf9ff",
                    color: "#1e1a61",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: "14px", color: "#3c2f9f" }}>
                  {user.nome} {/* Apenas exibe nome */}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "700",
                color: "#6c65a7",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d6d0ff",
                    borderRadius: "8px",
                    backgroundColor: "#faf9ff",
                    color: "#1e1a61",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: "14px", color: "#3c2f9f" }}>
                  {user.email}
                </p>
              )}
            </div>

            {/* Cargo */}
            <div>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "700",
                color: "#6c65a7",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Cargo
              </label>
              {isEditing ? (
                <select
                  name="perfil"
                  value={formData.perfil || "comercial"}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d6d0ff",
                    borderRadius: "8px",
                    backgroundColor: "#faf9ff",
                    color: "#1e1a61",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    cursor: "pointer"
                  }}
                >
                  <option value="comercial">👔 Comercial</option>
                  <option value="operacional">📋 Operacional</option>
                  <option value="tecnico">🔧 Técnico</option>
                  <option value="gestor">👨‍💼 Gestor</option>
                  <option value="delivery">🚚 Delivery</option>
                  <option value="admin">🔐 Admin</option>
                </select>
              ) : (
                <p style={{ margin: 0, fontSize: "14px", color: "#3c2f9f" }}>
                  {perfis[user.perfil]?.label || user.perfil}
                </p>
              )}
            </div>

            {/* Telefone */}
            <div>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "700",
                color: "#6c65a7",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Telefone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone || ""}
                  onChange={handleChange}
                  placeholder="(XX) XXXXX-XXXX"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d6d0ff",
                    borderRadius: "8px",
                    backgroundColor: "#faf9ff",
                    color: "#1e1a61",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: "14px", color: "#3c2f9f" }}>
                  {user.telefone || "Não informado"}
                </p>
              )}
            </div>

            {/* Departamento */}
            <div>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "700",
                color: "#6c65a7",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Departamento
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="departamento"
                  value={formData.departamento || ""}
                  onChange={handleChange}
                  placeholder="Ex: Vendas, Suporte..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d6d0ff",
                    borderRadius: "8px",
                    backgroundColor: "#faf9ff",
                    color: "#1e1a61",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: "14px", color: "#3c2f9f" }}>
                  {user.departamento || "Não informado"}
                </p>
              )}
            </div>

            {/* Data de criação */}
            <div style={{ paddingTop: "12px", borderTop: "1px solid #e0e0e0" }}>
              <label style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "700",
                color: "#6c65a7",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                Membro Desde
              </label>
              <p style={{ margin: 0, fontSize: "14px", color: "#3c2f9f" }}>
                {new Date(user.createdAt).toLocaleDateString("pt-BR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </p>
            </div>
          </div>

          {/* Botões de ação */}
          <div style={{
            display: "flex",
            gap: "12px",
            marginTop: "28px",
            paddingTop: "20px",
            borderTop: "1px solid #e0e0e0"
          }}>
            {isEditing ? (
              <>
                {/* Cancelar edição */}
                <button
                  onClick={() => {
                    setIsEditing(false); // Sai do modo edição
                    setFormData(user); // Restaura dados originais
                    setAvatarPreview(user.avatar); // Restaura avatar
                    setError(""); // Limpa erros
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    border: "1px solid #d6d0ff",
                    borderRadius: "8px",
                    backgroundColor: "#f8f7ff",
                    color: "#5b4eaa",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}
                >
                  Cancelar
                </button>

                {/* Salvar alterações */}
                <button
                  onClick={handleSaveProfile}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "8px",
                    background: "linear-gradient(90deg, #8b64ff, #5a30ff)",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}
                >
                  💾 Salvar Alterações
                </button>
              </>
            ) : (
              /* Botão para ativar modo edição */
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  borderRadius: "8px",
                  background: "linear-gradient(90deg, #8b64ff, #5a30ff)",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px"
                }}
              >
                ✏️ Editar Perfil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}