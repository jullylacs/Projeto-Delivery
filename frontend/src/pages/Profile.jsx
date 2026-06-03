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
  // Estados para alteração de senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
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

      // Valida campos de senha se o usuário quiser alterar
      if (newPassword || confirmNewPassword || currentPassword) {
        if (!currentPassword) {
          setError("Informe sua senha atual para alterá-la.");
          return;
        }
        if (newPassword !== confirmNewPassword) {
          setError("A nova senha e a confirmação não coincidem.");
          return;
        }
        if (newPassword.length < 6) {
          setError("A nova senha deve ter no mínimo 6 caracteres.");
          return;
        }
      }

      const payload = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        departamento: formData.departamento,
        avatar: formData.avatar,
        ...(newPassword ? { senhaAtual: currentPassword, novaSenha: newPassword } : {}),
      };

      const response = await api.put(`/users/${userId}`, payload); // RequisiÃ§Ã£o PUT para atualizar perfil
      const normalizedUser = { ...response.data, avatar: normalizeAvatar(response.data?.avatar) };
      setUser(normalizedUser); // Atualiza estado do usuÃ¡rio
      localStorage.setItem("user", JSON.stringify(normalizedUser)); // Atualiza localStorage
      window.dispatchEvent(new Event("user-updated"));
      setIsEditing(false);
      setError("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setSuccessMessage("Perfil atualizado com sucesso!");
    } catch (err) {
      setSuccessMessage("");
      setError("Erro ao atualizar perfil: " + (err.response?.data?.message || err.message)); // Mostra erro detalhado
    }
  };

  const PERFIS = {
    comercial:      { label: "Comercial",         color: "#1e40af" },
    operacional:    { label: "Operacional",        color: "#059669" },
    tecnico:        { label: "Técnico",            color: "#d97706" },
    delivery:       { label: "Delivery",           color: "#9b1b5a" },
    gestor:         { label: "Gestor",             color: "#7c3aed" },
    gestor_delivery:{ label: "Gestora Delivery",   color: "#9b1b5a" },
    admin:          { label: "Admin",              color: "#dc2626" },
    bko:            { label: "BKO",                color: "#1a56aa" },
    noc:            { label: "NOC",                color: "#0e6b3a" },
    convidado:      { label: "Convidado",          color: "#7a5b00" },
  };

  const initials = (name) =>
    String(name || "")
      .split(" ").filter(Boolean).slice(0, 2)
      .map((w) => w[0].toUpperCase()).join("") || "U";

  if (loading) {
    return (
      <div style={{ padding: "24px", background: "var(--bg)", minHeight: "94vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#7264a8", fontSize: 14, fontWeight: 600 }}>Carregando perfil…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#c62828" }}>
        Erro ao carregar perfil
      </div>
    );
  }

  const perfilInfo = PERFIS[user.perfil] || { label: user.perfil, color: "#6b7a95" };

  return (
    <div style={{ padding: "22px 24px", background: "var(--bg)", minHeight: "94vh", color: "var(--text)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Alertas */}
        {error && (
          <div style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 10, border: "1px solid #f3b3b3", background: "#fff1f2", color: "#9b1f1f", fontSize: 13, fontWeight: 600, display: "flex", gap: 8 }}>
            <span>⚠</span> {error}
          </div>
        )}
        {successMessage && (
          <div style={{ marginBottom: 14, padding: "11px 14px", borderRadius: 10, border: "1px solid #86efac", background: "#f0fdf4", color: "#166534", fontSize: 13, fontWeight: 600, display: "flex", gap: 8 }}>
            <span>✓</span> {successMessage}
          </div>
        )}

        {/* Card principal */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(90,60,180,0.12)" }}>

          {/* Banner / Hero */}
          <div style={{ background: "linear-gradient(135deg, #4a1fa8 0%, #6c3bff 50%, #9b6dff 100%)", padding: "32px 24px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {/* Avatar */}
            <div style={{ position: "relative" }}>
              <div style={{
                width: 96, height: 96, borderRadius: "50%",
                background: avatarPreview ? "transparent" : "rgba(255,255,255,0.2)",
                backgroundImage: avatarPreview ? `url(${avatarPreview})` : "none",
                backgroundSize: "cover", backgroundPosition: "center",
                border: "3px solid rgba(255,255,255,0.6)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, fontWeight: 800, color: "#fff",
              }}>
                {!avatarPreview && initials(user.nome)}
              </div>
              {isEditing && (
                <label style={{ position: "absolute", bottom: 0, right: 0, background: "#6c3bff", border: "2px solid #fff", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14 }}
                  title="Mudar foto">
                  📷
                  <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
                </label>
              )}
            </div>

            <div style={{ textAlign: "center" }}>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px" }}>{user.nome}</h2>
              <span style={{ display: "inline-block", marginTop: 6, padding: "3px 12px", background: "rgba(255,255,255,0.18)", color: "#fff", borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: "0.3px" }}>
                {perfilInfo.label}
              </span>
            </div>
          </div>

          {/* Corpo */}
          <div style={{ padding: "24px 28px 28px" }}>

            {/* Grid de campos */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 24px", marginBottom: 20 }}>
              <Field label="Nome completo" editing={isEditing}>
                {isEditing
                  ? <input name="nome" value={formData.nome || ""} onChange={handleChange} style={inputSt} />
                  : <span style={valueSt}>{user.nome}</span>}
              </Field>

              <Field label="E-mail" editing={isEditing}>
                {isEditing
                  ? <input type="email" name="email" value={formData.email || ""} onChange={handleChange} style={inputSt} />
                  : <span style={valueSt}>{user.email}</span>}
              </Field>

              <Field label="Telefone" editing={isEditing}>
                {isEditing
                  ? <input type="tel" name="telefone" value={formData.telefone || ""} onChange={handleChange} placeholder="(XX) XXXXX-XXXX" style={inputSt} />
                  : <span style={valueSt}>{user.telefone || <em style={{ color: "#b0a6d8" }}>Não informado</em>}</span>}
              </Field>

              <Field label="Departamento" editing={isEditing}>
                {isEditing
                  ? <input name="departamento" value={formData.departamento || ""} onChange={handleChange} placeholder="Ex: Vendas, Suporte…" style={inputSt} />
                  : <span style={valueSt}>{user.departamento || <em style={{ color: "#b0a6d8" }}>Não informado</em>}</span>}
              </Field>

              <Field label="Cargo">
                <span style={{ ...valueSt, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: perfilInfo.color, flexShrink: 0 }} />
                  {perfilInfo.label}
                </span>
              </Field>

              <Field label="Membro desde">
                <span style={valueSt}>
                  {new Date(user.createdAt).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </Field>
            </div>

            {/* Seção de senha (só em edição) */}
            {isEditing && (
              <div style={{ borderTop: "1px solid #f0eaff", paddingTop: 20, marginBottom: 20 }}>
                <p style={sectionTitleSt}>Alterar senha</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px 16px" }}>
                  <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Senha atual" style={inputSt} autoComplete="current-password" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nova senha" style={inputSt} autoComplete="new-password" />
                  <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirmar nova senha" style={inputSt} autoComplete="new-password" />
                </div>
              </div>
            )}

            {/* Botões */}
            <div style={{ borderTop: "1px solid #f0eaff", paddingTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              {isEditing ? (
                <>
                  <button
                    onClick={() => { setIsEditing(false); setFormData(user); setAvatarPreview(user.avatar); setError(""); }}
                    style={cancelBtnSt}
                  >
                    Cancelar
                  </button>
                  <button onClick={handleSaveProfile} style={saveBtnSt}>
                    Salvar alterações
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} style={saveBtnSt}>
                  Editar perfil
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-componente para campo label + valor
function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: "#6b5ca8", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.6px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputSt = {
  width: "100%", padding: "10px 12px",
  border: "1.5px solid var(--border)", borderRadius: 10,
  fontSize: 13, background: "var(--bg-input)", color: "var(--text)",
  boxSizing: "border-box", outline: "none",
};

const valueSt = { fontSize: 14, color: "#1e2d4a", fontWeight: 600 };

const sectionTitleSt = {
  margin: "0 0 12px", fontSize: 11, fontWeight: 800,
  color: "#6b5ca8", textTransform: "uppercase", letterSpacing: "0.6px",
};

const cancelBtnSt = {
  border: "1.5px solid #d4c8fb", background: "#f6f2ff", color: "#4b2d84",
  padding: "9px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
};

const saveBtnSt = {
  background: "linear-gradient(135deg, #6c3bff 0%, #9b6dff 100%)", color: "#fff",
  border: "none", padding: "9px 24px", borderRadius: 10, cursor: "pointer",
  fontWeight: 700, fontSize: 13, boxShadow: "0 3px 10px rgba(108,59,255,0.32)",
};
