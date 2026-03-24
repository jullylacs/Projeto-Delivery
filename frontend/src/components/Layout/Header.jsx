import { useNavigate } from "react-router-dom"; // Hook para navegação programática
import { useState, useEffect } from "react";     // Hooks de estado e ciclo de vida

// Componente de cabeçalho da aplicação com navegação, busca e menu do usuário
export default function Header() {
  const navigate = useNavigate(); // Hook para redirecionamento de rotas
  const [showMenu, setShowMenu] = useState(false); // Controla visibilidade do menu dropdown
  const [user, setUser] = useState(null); // Armazena dados do usuário logado

  // Carrega dados do usuário do localStorage ao montar o componente
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}"); // Busca o objeto 'user'
    setUser(userData); // Atualiza estado do usuário
  }, []); // Executa apenas na montagem

  // Função que realiza logout
  const handleLogout = () => {
    // Remove dados de sessão/localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login"); // Redireciona para a tela de login
  };

  // Função que extrai iniciais do nome do usuário para exibir no avatar
  const getInitials = (nome) => {
    return nome
      ?.split(" ") // Divide o nome por espaços
      .map(n => n[0]) // Pega a primeira letra de cada palavra
      .join("") // Junta as iniciais
      .toUpperCase() // Converte para maiúsculas
      .slice(0, 2) || "⭐"; // Limita a duas letras, fallback para estrela
  };

  return (
    <div
      style={{
        height: "70px",
        background: "rgba(76, 29, 149, 0.9)", // Roxo translúcido
        backdropFilter: "blur(10px)",          // Desfoque de fundo
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 30px",
        borderBottom: "1px solid rgba(255,255,255,0.1)", // Linha inferior
        color: "#fff",
        position: "relative" // Necessário para posicionar dropdown
      }}
    >
      {/* Título */}
      <h2
        style={{
          margin: 0,
          fontWeight: "500",
          letterSpacing: "0.5px"
        }}
      >
        🚀 Delivery Panel
      </h2>

      {/* Área direita contendo notificações e menu do usuário */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>

        {/* Ícone de Notificação */}
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"} // Hover
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} // Normal
        >
          🔔
        </div>

        {/* Usuário com menu dropdown */}
        <div style={{ position: "relative" }}>
          {/* Botão de usuário que abre/fecha dropdown */}
          <div
            onClick={() => setShowMenu(!showMenu)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.1)",
              transition: "0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"} // Hover
            onMouseLeave={(e) => {
              if (!showMenu) { // Só volta ao normal se dropdown fechado
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: user?.avatar
                  ? `url(${user.avatar})` // Se tiver imagem
                  : "linear-gradient(135deg, #9d4edd6a, #c77dff)", // Caso não
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "12px"
              }}
            >
              {/* Mostra iniciais se não houver avatar */}
              {!user?.avatar && getInitials(user?.nome)}
            </div>

            {/* Nome do usuário */}
            <span style={{ fontSize: "14px" }}>{user?.nome || "Usuário"}</span>
          </div>

          {/* Menu Dropdown */}
          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: "50px", // Abaixo do botão
                right: "0",
                background: "#fff",
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                minWidth: "200px",
                zIndex: 1000,
                overflow: "hidden"
              }}
            >
              {/* Email do usuário */}
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #e0e0e0",
                  fontSize: "12px",
                  color: "#666",
                  fontWeight: "600"
                }}
              >
                {user?.email}
              </div>

              {/* Botão Meu Perfil */}
              <button
                onClick={() => {
                  navigate("/profile"); // Redireciona
                  setShowMenu(false); // Fecha dropdown
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "none",
                  background: "transparent",
                  color: "#3c2f9f",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  textAlign: "left",
                  transition: "0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f5"} // Hover
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"} // Normal
              >
                👤 Meu Perfil
              </button>

              {/* Botão Sair */}
              <div style={{ borderTop: "1px solid #e0e0e0" }}>
                <button
                  onClick={() => {
                    handleLogout(); // Executa logout
                    setShowMenu(false); // Fecha dropdown
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    background: "transparent",
                    color: "#d32f2f",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    textAlign: "left"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#fce4ec"} // Hover
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"} // Normal
                >
                  🚪 Sair
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}