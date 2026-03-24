import { useState } from "react"; // Hook useState para gerenciar estados locais
import { useNavigate, Link } from "react-router-dom"; // useNavigate para navegação programática, Link para navegação entre rotas
import api from "../services/api"; // Instância de API para comunicação com backend

// Componente da página de login
export default function Login() {
  const [email, setEmail] = useState(""); // Estado para armazenar o email digitado
  const [senha, setSenha] = useState(""); // Estado para armazenar a senha digitada
  const [perfil, setPerfil] = useState("comercial"); // Estado para armazenar o perfil selecionado
  const [loading, setLoading] = useState(false); // Estado que indica se a requisição está em andamento
  const navigate = useNavigate(); // Hook para redirecionar usuário após login

  // Função que realiza login via API
  const login = async () => {
    try {
      setLoading(true); // Ativa loading
      const res = await api.post("/users/login", { email, senha, perfil }); // Chamada POST para login
      localStorage.setItem("token", res.data.token); // Salva token no localStorage
      localStorage.setItem("user", JSON.stringify(res.data.user)); // Salva dados do usuário no localStorage
      alert("Logado com sucesso!"); // Alerta de sucesso
      navigate("/dashboard"); // Redireciona para dashboard
    } catch (error) {
      // Caso ocorra erro, exibe mensagem apropriada
      alert("Falha no login: " + (error.response?.data?.message || "Erro ao conectar"));
    } finally {
      setLoading(false); // Desativa loading independente do resultado
    }
  };

  // Permite que o usuário pressione Enter para enviar o login
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      login(); // Chama função de login
    }
  };
  
  // Renderização do componente
  return (
    <div style={{
      display: "flex", // Centraliza o conteúdo horizontal e verticalmente
      alignItems: "center",
      justifyContent: "center",
      height: "100vh", // Ocupa toda a altura da tela
      background: "linear-gradient(135deg, #240046, #3c096c)" // Gradiente de fundo
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)", // Fundo semi-transparente
        padding: "50px", // Espaçamento interno
        borderRadius: "20px", // Bordas arredondadas
        border: "1px solid rgba(255,255,255,0.1)", // Borda sutil
        backdropFilter: "blur(10px)", // Efeito de blur
        width: "100%",
        maxWidth: "400px", // Largura máxima do container
        textAlign: "center",
        color: "#fff"
      }}>
        {/* Título do sistema */}
        <h1 style={{ marginBottom: "30px", fontSize: "32px" }}>🚀 Delivery</h1>
        <p style={{ marginBottom: "30px", opacity: 0.8 }}>Sistema de Gerenciamento</p>
        
        {/* Campo de email */}
        <input
          placeholder="Email"
          type="email"
          value={email} // Valor do input vinculado ao estado
          onChange={e => setEmail(e.target.value)} // Atualiza estado ao digitar
          onKeyPress={handleKeyPress} // Permite login ao pressionar Enter
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
        
        {/* Campo de senha */}
        <input
          placeholder="Senha"
          type="password"
          value={senha} // Valor do input vinculado ao estado
          onChange={e => setSenha(e.target.value)} // Atualiza estado ao digitar
          onKeyPress={handleKeyPress} // Permite login ao pressionar Enter
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

        {/* Select de perfil */}
        <select
          value={perfil} // Valor vinculado ao estado perfil
          onChange={e => setPerfil(e.target.value)} // Atualiza estado ao selecionar
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
          {/* Opções de perfil */}
          <option value="comercial">👔 Comercial</option>
          <option value="operacional">📋 Operacional</option>
          <option value="tecnico">🔧 Técnico</option>
          <option value="gestor">👨‍💼 Gestor</option>
          <option value="delivery">🚚 Delivery</option>
          <option value="admin">🔐 Admin</option>
        </select>
        
        {/* Botão de login */}
        <button
          onClick={login} // Chama função de login ao clicar
          disabled={loading} // Desativa botão enquanto carrega
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
          onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = "scale(1.02)")} // Pequena animação ao passar mouse
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {loading ? "Entrando..." : "Entrar"} {/* Texto muda quando carregando */}
        </button>

        {/* Link para página de registro */}
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
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.7"} // Efeito hover
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            Registre-se
          </Link>
        </div>
      </div>
    </div>
  );
}