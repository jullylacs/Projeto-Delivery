import { useEffect, useState } from "react"; // Hooks do React
import { useNavigate } from "react-router-dom"; // Hook para navegaÃ§Ã£o programÃ¡tica
import api from "../services/api"; // InstÃ¢ncia de API configurada para comunicaÃ§Ã£o com backend

export default function Profile() {
  // Estados do componente
  const [user, setUser] = useState(null); // Armazena dados do usuÃ¡rio
  const [loading, setLoading] = useState(true); // Indica se o perfil estÃ¡ sendo carregado
  const [isEditing, setIsEditing] = useState(false); // Define se o usuÃ¡rio estÃ¡ no modo de ediÃ§Ã£o
  const [formData, setFormData] = useState({}); // Armazena dados do formulÃ¡rio enquanto edita
  const [avatarPreview, setAvatarPreview] = useState(null); // Armazena preview do avatar
  const [error, setError] = useState(""); // Mensagem de erro
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate(); // Hook para navegaÃ§Ã£o programÃ¡tica

  // Carrega perfil do usuÃ¡rio ao montar o componente
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}"); // Busca dados do usuÃ¡rio no localStorage
    const userId = userData?._id || userData?.id;

    if (!userId) {
      navigate("/login"); // Se nÃ£o tiver usuÃ¡rio, redireciona para login
      return;
    }

    fetchUserProfile(userId); // Busca perfil do usuÃ¡rio no backend
  }, [navigate]);

  // FunÃ§Ã£o para buscar perfil do usuÃ¡rio pelo ID
  const fetchUserProfile = async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`); // RequisiÃ§Ã£o GET para backend
      setUser(response.data); // Salva dados do usuÃ¡rio
      setFormData(response.data); // Preenche formulÃ¡rio com os dados atuais
      setAvatarPreview(response.data.avatar); // Define avatar
      setLoading(false); // Desativa loading
    } catch (err) {
      console.error("Erro ao buscar perfil:", err); // Loga erro
      setError("Erro ao carregar perfil"); // Mostra mensagem de erro
      setLoading(false); // Desativa loading
    }
  };

  // Atualiza valores do formulÃ¡rio conforme usuÃ¡rio digita
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value // Atualiza o campo especÃ­fico do formulÃ¡rio
    }));
    setError(""); // Limpa erro ao digitar
    setSuccessMessage("");
  };

  // FunÃ§Ã£o para alterar avatar com preview
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]; // Pega arquivo selecionado
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result); // Atualiza preview
        setFormData(prev => ({
          ...prev,
          avatar: reader.result // Salva avatar em base64 no formulÃ¡rio
        }));
      };
      reader.readAsDataURL(file); // Converte arquivo para base64
    }
  };

  // Salva alteraÃ§Ãµes do perfil no backend
  const handleSaveProfile = async () => {
    try {
      const userId = user?._id || user?.id;
      if (!userId) {
        setError("Identificador de usuÃ¡rio invÃ¡lido");
        return;
      }

      const response = await api.put(`/users/${userId}`, formData); // RequisiÃ§Ã£o PUT para atualizar perfil
      setUser(response.data); // Atualiza estado do usuÃ¡rio
      localStorage.setItem("user", JSON.stringify(response.data)); // Atualiza localStorage
      window.dispatchEvent(new Event("user-updated"));
      setIsEditing(false); // Sai do modo ediÃ§Ã£o
      setError(""); // Limpa erro
      setSuccessMessage("Perfil atualizado com sucesso!");
    } catch (err) {
      setSuccessMessage("");
      setError("Erro ao atualizar perfil: " + (err.response?.data?.message || err.message)); // Mostra erro detalhado
    }
  };

  // Objetos de perfis com label e cor para visualizaÃ§Ã£o
  const perfis = {
    comercial: { label: "ðŸ‘” Comercial", color: "#1e40af" },
    operacional: { label: "ðŸ“‹ Operacional", color: "#059669" },
    tecnico: { label: "ðŸ”§ TÃ©cnico", color: "#d97706" },
    gestor: { label: "ðŸ‘¨â€ðŸ’¼ Gestor", color: "#7c3aed" },
    delivery: { label: "ðŸšš Delivery", color: "#0ea5e9" },
    admin: { label: "ðŸ” Admin", color: "#dc2626" }
  };

  // Renderiza loading enquanto busca dados
  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#5f5a88" }}>
        Carregando perfil...
      </div>
    );
  }

  // Caso nÃ£o tenha usuÃ¡rio carregado, mostra erro
  if (!user) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#c62828" }}>
        Erro ao carregar perfil
      </div>
    );
  }

  // RenderizaÃ§Ã£o principal do componente
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
          <h1 style={{ margin: 0, color: "#3c2f9f", fontSize: "28px" }}>ðŸ‘¤ Meu Perfil</h1>
          <p style={{ color: "#5f5a88", fontSize: "14px", marginTop: "4px" }}>
            Visualize e edite suas informaÃ§Ãµes
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

        {successMessage && (
          <div style={{
            padding: "12px 16px",
            backgroundColor: "#ecfdf3",
            border: "1px solid #35c986",
            borderRadius: "8px",
            color: "#146c43",
            marginBottom: "16px",
            fontSize: "14px"
          }}>
            {successMessage}
          </div>
        )}

        {/* Card de perfil */}
        <div style={{
          backgroundColor: "#fff",
          border: "1px solid #d6d0ff",
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
              backgroundColor: avatarPreview ? "transparent" : "#8b64ff", // Cor padrÃ£o se nÃ£o tiver avatar
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
              {!avatarPreview && "ðŸ‘¤"} {/* Emoji padrÃ£o */}
            </div>

            {/* BotÃ£o para alterar avatar */}
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
                ðŸ“¸ Mudar Foto
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

          {/* InformaÃ§Ãµes */}
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
                    color: "#1f2b46",
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
                    color: "#1f2b46",
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
                    color: "#1f2b46",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    cursor: "pointer"
                  }}
                >
                  <option value="comercial">ðŸ‘” Comercial</option>
                  <option value="operacional">ðŸ“‹ Operacional</option>
                  <option value="tecnico">ðŸ”§ TÃ©cnico</option>
                  <option value="gestor">ðŸ‘¨â€ðŸ’¼ Gestor</option>
                  <option value="delivery">ðŸšš Delivery</option>
                  <option value="admin">ðŸ” Admin</option>
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
                    color: "#1f2b46",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: "14px", color: "#3c2f9f" }}>
                  {user.telefone || "NÃ£o informado"}
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
                    color: "#1f2b46",
                    fontSize: "14px",
                    boxSizing: "border-box"
                  }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: "14px", color: "#3c2f9f" }}>
                  {user.departamento || "NÃ£o informado"}
                </p>
              )}
            </div>

            {/* Data de criaÃ§Ã£o */}
            <div style={{ paddingTop: "12px", borderTop: "1px solid #d6d0ff" }}>
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

          {/* BotÃµes de aÃ§Ã£o */}
          <div style={{
            display: "flex",
            gap: "12px",
            marginTop: "28px",
            paddingTop: "20px",
            borderTop: "1px solid #d6d0ff"
          }}>
            {isEditing ? (
              <>
                {/* Cancelar ediÃ§Ã£o */}
                <button
                  onClick={() => {
                    setIsEditing(false); // Sai do modo ediÃ§Ã£o
                    setFormData(user); // Restaura dados originais
                    setAvatarPreview(user.avatar); // Restaura avatar
                    setError(""); // Limpa erros
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    border: "1px solid #d6d0ff",
                    borderRadius: "8px",
                    backgroundColor: "#faf9ff",
                    color: "#5f5a88",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "14px"
                  }}
                >
                  Cancelar
                </button>

                {/* Salvar alteraÃ§Ãµes */}
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
                  ðŸ’¾ Salvar AlteraÃ§Ãµes
                </button>
              </>
            ) : (
              /* BotÃ£o para ativar modo ediÃ§Ã£o */
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
                âœï¸ Editar Perfil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
