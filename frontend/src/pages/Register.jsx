import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

export default function Register() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    confirmarSenha: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const validateForm = () => {
    if (!formData.nome.trim()) {
      setError("Nome é obrigatório");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email é obrigatório");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Email inválido");
      return false;
    }
    if (formData.senha.length < 6) {
      setError("Senha deve ter no mínimo 6 caracteres");
      return false;
    }
    if (formData.senha !== formData.confirmarSenha) {
      setError("Senhas não conferem");
      return false;
    }
    return true;
  };

  const register = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      await api.post("/users/register", {
        nome: formData.nome,
        email: formData.email,
        senha: formData.senha
      });
      
      alert("Conta criada com sucesso! Faça login agora.");
      navigate("/login");
    } catch (error) {
      const mensagem = error.response?.data?.message || "Erro ao registrar. Tente novamente.";
      setError(mensagem);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      register(e);
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
        maxWidth: "420px",
        color: "#fff"
      }}>
        <h1 style={{ marginBottom: "10px", fontSize: "32px", textAlign: "center" }}>🚀 Delivery</h1>
        <p style={{ marginBottom: "30px", opacity: 0.8, textAlign: "center", fontSize: "14px" }}>Crie sua conta</p>
        
        {error && (
          <div style={{
            padding: "12px 15px",
            marginBottom: "20px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.2)",
            border: "1px solid rgba(239, 68, 68, 0.5)",
            color: "#fca5a5",
            fontSize: "14px",
            textAlign: "center"
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={register}>
          <input
            type="text"
            name="nome"
            placeholder="Nome completo"
            value={formData.nome}
            onChange={handleChange}
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
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
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
            type="password"
            name="senha"
            placeholder="Senha"
            value={formData.senha}
            onChange={handleChange}
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
            type="password"
            name="confirmarSenha"
            placeholder="Confirmar Senha"
            value={formData.confirmarSenha}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            style={{
              width: "100%",
              padding: "12px 15px",
              marginBottom: "20px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
          
          <button
            type="submit"
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
            {loading ? "Criando conta..." : "Registrar"}
          </button>
        </form>

        <div style={{
          textAlign: "center",
          fontSize: "14px",
          opacity: 0.8
        }}>
          Já tem conta? 
          <Link to="/login" style={{
            color: "#c77dff",
            textDecoration: "none",
            fontWeight: "bold",
            marginLeft: "5px",
            transition: "0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            Faça login
          </Link>
        </div>
      </div>
    </div>
  );
}
