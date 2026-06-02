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

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const getApiErrorMessage = (error, fallback) => {
    const data = error?.response?.data;
    if (typeof data === "string") return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return fallback;
  };

  const login = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = await api.post("/users/login", { email, senha });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      if (res.data.refreshToken) {
        localStorage.setItem("refreshToken", res.data.refreshToken);
      }
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Erro ao conectar com o servidor."));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") login();
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "linear-gradient(135deg, #0f0320 0%, #1e0638 40%, #2c0b52 70%, #3d1472 100%)",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Orbes decorativos de fundo */}
      <div style={{
        position: "absolute", width: "500px", height: "500px",
        borderRadius: "50%", top: "-120px", left: "-160px",
        background: "radial-gradient(circle, rgba(124,77,255,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: "400px", height: "400px",
        borderRadius: "50%", bottom: "-100px", right: "-80px",
        background: "radial-gradient(circle, rgba(199,125,255,0.14) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: "300px", height: "300px",
        borderRadius: "50%", top: "50%", left: "55%",
        background: "radial-gradient(circle, rgba(90,48,255,0.1) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Card principal */}
      <div style={{
        background: "rgba(255,255,255,0.05)",
        padding: "48px 44px",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        width: "100%",
        maxWidth: "420px",
        color: "#fff",
        boxShadow: "0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(199,125,255,0.08)",
        position: "relative",
        zIndex: 1,
      }}>

        {/* Logo e título */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{
            width: "56px", height: "56px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #7a4dff, #c77dff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "24px",
            margin: "0 auto 16px",
            boxShadow: "0 8px 24px rgba(124,77,255,0.4)",
          }}>
            🚀
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: "700", letterSpacing: "-0.3px" }}>
            Bem-vindo de volta
          </h1>
          <p style={{ margin: 0, opacity: 0.5, fontSize: "14px" }}>
            Sistema de Gerenciamento NVX
          </p>
        </div>

        {/* Erro */}
        {errorMessage && (
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
            <span style={{ flexShrink: 0 }}>⚠️</span>
            {errorMessage}
          </div>
        )}

        {/* Campos */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", opacity: 0.65, marginBottom: "6px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Email
            </label>
            <input
              placeholder="seu@email.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = "rgba(199,125,255,0.6)"; e.target.style.background = "rgba(255,255,255,0.1)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.background = "rgba(255,255,255,0.07)"; }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", opacity: 0.65, marginBottom: "6px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Senha
            </label>
            <input
              placeholder="••••••••"
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyPress={handleKeyPress}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = "rgba(199,125,255,0.6)"; e.target.style.background = "rgba(255,255,255,0.1)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.15)"; e.target.style.background = "rgba(255,255,255,0.07)"; }}
            />
          </div>
        </div>

        {/* Botão */}
        <button
          onClick={login}
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
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {/* Divisor */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
          <span style={{ fontSize: "12px", opacity: 0.4 }}>ou</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
        </div>

        {/* Link registro */}
        <p style={{ margin: 0, textAlign: "center", fontSize: "14px", opacity: 0.65 }}>
          Não tem conta?{" "}
          <Link to="/register" style={{ color: "#c77dff", textDecoration: "none", fontWeight: "600" }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
          >
            Registre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
