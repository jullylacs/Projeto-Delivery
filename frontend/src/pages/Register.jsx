import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

const inputStyle = {
  width: "100%",
  padding: "13px 16px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.07)",
  color: "#fff",
  fontSize: "14px",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 180ms ease, background 180ms ease",
};

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: "block",
        fontSize: "12px",
        fontWeight: "600",
        opacity: 0.65,
        marginBottom: "6px",
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        color: "#fff",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function Register() {
  const [formData, setFormData] = useState({ nome: "", email: "", senha: "", confirmarSenha: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const getApiErrorMessage = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === "string") return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return fallback;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.nome.trim()) return setError("Nome é obrigatório"), false;
    if (formData.nome.trim().length < 3) return setError("Nome deve ter no mínimo 3 caracteres"), false;
    if (!formData.email.trim()) return setError("Email é obrigatório"), false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return setError("Email inválido"), false;
    if (!formData.senha) return setError("Senha é obrigatória"), false;
    if (formData.senha.length < 8) return setError("Senha deve ter no mínimo 8 caracteres"), false;
    if (formData.senha !== formData.confirmarSenha) return setError("Senhas não conferem"), false;
    return true;
  };

  const register = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/users/register", {
        nome: formData.nome.trim(),
        email: formData.email.trim().toLowerCase(),
        senha: formData.senha,
      });
      setSuccess(response?.data?.message || "Cadastro enviado para aprovação!");
      setTimeout(() => navigate("/login"), 1400);
    } catch (err) {
      if (err.response?.status === 409) {
        setError(getApiErrorMessage(err, "Email já cadastrado. Use outro ou faça login."));
      } else if (err.request) {
        setError("Erro de conexão. Verifique se o servidor está rodando.");
      } else {
        setError(getApiErrorMessage(err, "Erro ao registrar. Tente novamente."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) register(e);
  };

  const onFocus = e => { e.target.style.borderColor = "rgba(199,125,255,0.6)"; e.target.style.background = "rgba(255,255,255,0.1)"; };
  const onBlur  = e => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.background = "rgba(255,255,255,0.07)"; };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0320 0%, #1e0638 40%, #2c0b52 70%, #3d1472 100%)",
      padding: "24px",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Orbes decorativos */}
      <div style={{
        position: "fixed", width: "500px", height: "500px",
        borderRadius: "50%", top: "-150px", right: "-100px",
        background: "radial-gradient(circle, rgba(124,77,255,0.16) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", width: "400px", height: "400px",
        borderRadius: "50%", bottom: "-100px", left: "-120px",
        background: "radial-gradient(circle, rgba(199,125,255,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Card */}
      <div style={{
        background: "rgba(255,255,255,0.05)",
        padding: "44px 40px",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        width: "100%",
        maxWidth: "440px",
        color: "#fff",
        boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(199,125,255,0.08)",
        position: "relative",
        zIndex: 1,
      }}>

        {/* Cabeçalho */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "52px", height: "52px",
            borderRadius: "15px",
            background: "linear-gradient(135deg, #7a4dff, #c77dff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px",
            margin: "0 auto 14px",
            boxShadow: "0 8px 24px rgba(124,77,255,0.4)",
          }}>
            🚀
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: "700", letterSpacing: "-0.3px" }}>
            Criar conta
          </h1>
          <p style={{ margin: 0, opacity: 0.5, fontSize: "13px" }}>
            Preencha os dados para se registrar
          </p>
        </div>

        {/* Feedback */}
        {error && (
          <div style={{
            padding: "11px 14px",
            marginBottom: "20px",
            borderRadius: "10px",
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: "#fecaca",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{ flexShrink: 0 }}>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div style={{
            padding: "11px 14px",
            marginBottom: "20px",
            borderRadius: "10px",
            background: "rgba(52,211,153,0.14)",
            border: "1px solid rgba(52,211,153,0.4)",
            color: "#a7f3d0",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span style={{ flexShrink: 0 }}>✅</span> {success}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={register}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
            <Field label="Nome completo">
              <input type="text" name="nome" placeholder="Seu nome"
                value={formData.nome} onChange={handleChange} onKeyPress={handleKeyPress}
                style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </Field>

            <Field label="Email">
              <input type="email" name="email" placeholder="seu@email.com"
                value={formData.email} onChange={handleChange} onKeyPress={handleKeyPress}
                style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Senha">
                <input type="password" name="senha" placeholder="••••••••"
                  value={formData.senha} onChange={handleChange} onKeyPress={handleKeyPress}
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </Field>
              <Field label="Confirmar">
                <input type="password" name="confirmarSenha" placeholder="••••••••"
                  value={formData.confirmarSenha} onChange={handleChange} onKeyPress={handleKeyPress}
                  style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </Field>
            </div>

            <p style={{ margin: 0, fontSize: "12px", opacity: 0.4, textAlign: "center" }}>
              Mínimo 8 caracteres na senha
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "10px",
              border: "none",
              background: loading
                ? "rgba(124,77,255,0.5)"
                : "linear-gradient(135deg, #7a4dff 0%, #9d4edd 50%, #c77dff 100%)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 200ms ease, transform 150ms ease, box-shadow 200ms ease",
              boxShadow: loading ? "none" : "0 4px 20px rgba(124,77,255,0.45)",
              letterSpacing: "0.2px",
              marginBottom: "24px",
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(124,77,255,0.55)"; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,77,255,0.45)"; }}
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        {/* Divisor */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: "12px", opacity: 0.4 }}>ou</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
        </div>

        <p style={{ margin: 0, textAlign: "center", fontSize: "14px", opacity: 0.65 }}>
          Já tem conta?{" "}
          <Link to="/login" style={{ color: "#c77dff", textDecoration: "none", fontWeight: "600" }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
