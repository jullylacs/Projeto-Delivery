import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

// Componente de cabeçalho da aplicação com navegação, busca e menu do usuário
export default function Header() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false); // Controla visibilidade do menu dropdown
  const [user, setUser] = useState(null); // Dados do usuário logado

  // Carrega dados do usuário do localStorage ao montar o componente
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(userData);
  }, []);

  // Função que realiza logout, limpando dados e redirecionando para login
  const handleLogout = () => {
    // Limpar dados de sessão se houver
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // Função que extrai iniciais do nome do usuário para avatar
  const getInitials = (nome) => {
    return nome
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "⭐";
  };

  return (
    <div style={{
      height: "70px",
      background: "rgba(76, 29, 149, 0.9)",
      backdropFilter: "blur(10px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 30px",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      color: "#fff",
      position: "relative"
    }}>
      
      {/* Título */}
      <h2 style={{
        margin: 0,
        fontWeight: "500",
        letterSpacing: "0.5px"
      }}>
        🚀 Delivery Panel
      </h2>

      {/* Área direita */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>

        {/* Notificação */}
        <div style={{
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
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
        >
          🔔
        </div>

        {/* Usuário com Menu Dropdown */}
        <div style={{ position: "relative" }}>
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
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
            onMouseLeave={(e) => {
              if (!showMenu) {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }
            }}
          >
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: user?.avatar 
                ? `url(${user.avatar})`
                : "linear-gradient(135deg, #9d4edd6a, #c77dff)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "12px"
            }}>
              {!user?.avatar && getInitials(user?.nome)}
            </div>
            <span style={{ fontSize: "14px" }}>{user?.nome || "Usuário"}</span>
          </div>

          {/* Menu Dropdown */}
          {showMenu && (
            <div style={{
              position: "absolute",
              top: "50px",
              right: "0",
              background: "#fff",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              minWidth: "200px",
              zIndex: 1000,
              overflow: "hidden"
            }}>
              <div style={{
                padding: "12px 16px",
                borderBottom: "1px solid #e0e0e0",
                fontSize: "12px",
                color: "#666",
                fontWeight: "600"
              }}>
                {user?.email}
              </div>

              <button
                onClick={() => {
                  navigate("/profile");
                  setShowMenu(false);
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
                onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f5"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                👤 Meu Perfil
              </button>

              <div style={{
                borderTop: "1px solid #e0e0e0"
              }}>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMenu(false);
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
                  onMouseEnter={(e) => e.currentTarget.style.background = "#fce4ec"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
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