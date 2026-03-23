import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

// Página de login da aplicação
export default function Login() {
  const [email, setEmail] = useState(""); // Email do usuário
  const [senha, setSenha] = useState(""); // Senha do usuário
  const [perfil, setPerfil] = useState("comercial"); // Perfil do usuário
  const [loading, setLoading] = useState(false); // Estado de carregamento
  const navigate = useNavigate();

  // Função que realiza o login via API
  const login = async () => {
    try {
      setLoading(true);
      const res = await api.post("/users/login", { email, senha, perfil });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      alert("Logado com sucesso!");
      navigate("/dashboard");
    } catch (error) {
      alert("Falha no login: " + (error.response?.data?.message || "Erro ao conectar"));
    } finally {
      setLoading(false);
    }
  };

  // Função que permite login ao pressionar Enter
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      login();
    }
  };
  
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "linear-gradient(135deg, #240046, #3c096c)"
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)",
        padding: "50px",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        width: "100%",
        maxWidth: "400px",
        textAlign: "center",
        color: "#fff"
      }}>
        <h1 style={{ marginBottom: "30px", fontSize: "32px" }}>🚀 Delivery</h1>
        <p style={{ marginBottom: "30px", opacity: 0.8 }}>Sistema de Gerenciamento</p>
        
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            width: "100%",
            padding: "12px 15px",
            marginBottom: "15px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            fontSize: "14px",
            boxSizing: "border-box"
          }}
        />
        
        <input
          placeholder="Senha"
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            width: "100%",
            padding: "12px 15px",
            marginBottom: "15px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
            fontSize: "14px",
            boxSizing: "border-box"
          }}
        />

        <select
          value={perfil}
          onChange={e => setPerfil(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 15px",
            marginBottom: "20px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            color: "#fff",
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
        
        <button
          onClick={login}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 15px",
            borderRadius: "8px",
            border: "none",
            background: "linear-gradient(135deg, #9d4edd, #c77dff)",
            color: "#fff",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "0.2s",
            opacity: loading ? 0.7 : 1,
            marginBottom: "15px"
          }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = "scale(1.02)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div style={{
          textAlign: "center",
          fontSize: "14px",
          opacity: 0.8
        }}>
          Não tem conta? 
          <Link to="/register" style={{
            color: "#c77dff",
            textDecoration: "none",
            fontWeight: "bold",
            marginLeft: "5px",
            transition: "0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            Registre-se
          </Link>
        </div>
      </div>
    </div>
  );
}