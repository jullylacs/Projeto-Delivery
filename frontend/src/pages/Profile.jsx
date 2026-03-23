import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    if (!userData._id) {
      navigate("/login");
      return;
    }

    fetchUserProfile(userData._id);
  }, [navigate]);

  const fetchUserProfile = async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`);
      setUser(response.data);
      setFormData(response.data);
      setAvatarPreview(response.data.avatar);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao buscar perfil:", err);
      setError("Erro ao carregar perfil");
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
        setFormData(prev => ({
          ...prev,
          avatar: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await api.put(`/users/${user._id}`, formData);
      setUser(response.data);
      localStorage.setItem("user", JSON.stringify(response.data));
      setIsEditing(false);
      setError("");
      alert("Perfil atualizado com sucesso!");
    } catch (err) {
      setError("Erro ao atualizar perfil: " + (err.response?.data?.message || err.message));
    }
  };

  const perfis = {
    comercial: { label: "👔 Comercial", color: "#1e40af" },
    operacional: { label: "📋 Operacional", color: "#059669" },
    tecnico: { label: "🔧 Técnico", color: "#d97706" },
    gestor: { label: "👨‍💼 Gestor", color: "#7c3aed" },
    delivery: { label: "🚚 Delivery", color: "#0ea5e9" },
    admin: { label: "🔐 Admin", color: "#dc2626" }
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#666" }}>
        Carregando perfil...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#d32f2f" }}>
        Erro ao carregar perfil
      </div>
    );
  }

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

        {/* Card de Perfil */}
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
              backgroundColor: avatarPreview ? "transparent" : "#8b64ff",
              backgroundImage: avatarPreview ? `url(${avatarPreview})` : "none",
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
              {!avatarPreview && "👤"}
            </div>

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
                  style={{ display: "none" }}
                />
              </label>
            )}

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
                  {user.nome}
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

            {/* Data de Criação */}
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

          {/* Botões de Ação */}
          <div style={{
            display: "flex",
            gap: "12px",
            marginTop: "28px",
            paddingTop: "20px",
            borderTop: "1px solid #e0e0e0"
          }}>
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(user);
                    setAvatarPreview(user.avatar);
                    setError("");
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
                <button
                  onClick={handleSaveProfile}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "8px",
                    backgroundColor: "linear-gradient(90deg, #8b64ff, #5a30ff)",
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
