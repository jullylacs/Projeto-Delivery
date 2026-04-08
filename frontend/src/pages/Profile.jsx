import { useEffect, useState } from "react"; // Hooks do React
import { useNavigate } from "react-router-dom"; // Hook para navegaÃ§Ã£o programÃ¡tica
import api from "../services/api"; // InstÃ¢ncia de API configurada para comunicaÃ§Ã£o com backend

const MAX_AVATAR_UPLOAD_MB = 10;
const TARGET_AVATAR_BASE64_BYTES = 900 * 1024;
const MAX_AVATAR_DIMENSION = 1024;

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao processar imagem"));
    image.src = src;
  });

const compressAvatarImage = async (file) => {
  const initialDataUrl = await fileToDataUrl(file);
  const image = await loadImageElement(initialDataUrl);

  const maxSide = Math.max(image.width, image.height);
  const scale = maxSide > MAX_AVATAR_DIMENSION ? MAX_AVATAR_DIMENSION / maxSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Falha ao preparar compressao de imagem");
  }

  context.drawImage(image, 0, 0, width, height);

  // Reduz qualidade progressivamente para manter payload leve e evitar 413.
  let quality = 0.86;
  let compressed = canvas.toDataURL("image/jpeg", quality);

  while (compressed.length > TARGET_AVATAR_BASE64_BYTES && quality > 0.4) {
    quality -= 0.08;
    compressed = canvas.toDataURL("image/jpeg", quality);
  }

  return compressed;
};

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

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

  const normalizeAvatar = (value) => {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";

    const decoder = document.createElement("textarea");
    decoder.innerHTML = trimmed;
    return decoder.value.trim();
  };

  // Carrega perfil do usuÃ¡rio ao montar o componente
  useEffect(() => {
    const userData = readStoredUser(); // Busca dados do usuÃ¡rio no localStorage
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
      const response = await api.get(`/users/${userId}`); // Requisição GET para backend
      const normalizedUser = { ...response.data, avatar: normalizeAvatar(response.data?.avatar) };
      setUser(normalizedUser); // Salva dados do usuário
      setFormData(normalizedUser); // Preenche formulário com os dados atuais
      setAvatarPreview(normalizedUser.avatar); // Define avatar
      // Sincroniza localStorage para que o Header reflita o avatar atual
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      window.dispatchEvent(new Event("user-updated"));
      setLoading(false); // Desativa loading
    } catch (err) {
      console.error("Erro ao buscar perfil:", err); // Loga erro

      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      const localUser = readStoredUser();
      if (localUser) {
        setUser(localUser);
        setFormData(localUser);
        setAvatarPreview(localUser.avatar || null);
        setError("Não foi possível sincronizar com o servidor. Exibindo dados locais.");
      } else {
        setError("Erro ao carregar perfil"); // Mostra mensagem de erro
      }

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
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]; // Pega arquivo selecionado
    if (!file) return;

    try {
      const maxBytes = MAX_AVATAR_UPLOAD_MB * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`Imagem muito grande. Envie um arquivo de ate ${MAX_AVATAR_UPLOAD_MB}MB.`);
        setSuccessMessage("");
        return;
      }

      const compressedDataUrl = await compressAvatarImage(file);

      setAvatarPreview(compressedDataUrl); // Atualiza preview
      setFormData(prev => ({
        ...prev,
        avatar: compressedDataUrl // Salva avatar comprimido em base64 no formulÃ¡rio
      }));
      setError("");
    } catch (error) {
      setSuccessMessage("");
      setError(error.message || "Nao foi possivel processar a imagem");
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

      const payload = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        departamento: formData.departamento,
        avatar: formData.avatar,
      };

      const response = await api.put(`/users/${userId}`, payload); // RequisiÃ§Ã£o PUT para atualizar perfil
      const normalizedUser = { ...response.data, avatar: normalizeAvatar(response.data?.avatar) };
      setUser(normalizedUser); // Atualiza estado do usuÃ¡rio
      localStorage.setItem("user", JSON.stringify(normalizedUser)); // Atualiza localStorage
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
    comercial: { label: "Comercial", color: "#1e40af" },
    operacional: { label: "Operacional", color: "#059669" },
    tecnico: { label: "Tecnico", color: "#d97706" },
    delivery: { label: "Delivery", color: "#9b1b5a" },
    gestor: { label: "Gestor", color: "#7c3aed" },
    admin: { label: "Admin", color: "#dc2626" }
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
          <h1 style={{ margin: 0, color: "#3c2f9f", fontSize: "28px" }}>Meu Perfil</h1>
          <p style={{ color: "#5f5a88", fontSize: "14px", marginTop: "4px" }}>
            Visualize e edite suas informacoes
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
              {!avatarPreview && "U"}
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
                Mudar foto
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
              <p style={{ margin: 0, fontSize: "14px", color: "#3c2f9f" }}>
                {perfis[user.perfil]?.label || user.perfil}
              </p>
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
                  {user.telefone || "Nao informado"}
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
                  {user.departamento || "Nao informado"}
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
                  Salvar alteracoes
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
                Editar perfil
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
