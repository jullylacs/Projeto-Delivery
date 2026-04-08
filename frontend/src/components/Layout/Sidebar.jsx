import { useNavigate, useLocation } from "react-router-dom"; 
// useNavigate: permite navegação programática
// useLocation: fornece informação da rota atual

// Componente da barra lateral com menu de navegação
export default function Sidebar({ isOpen = true }) {
  const navigate = useNavigate(); // Hook para redirecionamento de rotas
  const location = useLocation(); // Hook para detectar a rota atual
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  // Itens do menu com nome, ícone e caminho
  const menuItems = [
    { name: "Dashboard", icon: "📊", path: "/dashboard" },
    { name: "Kanban", icon: "🗂️", path: "/kanban" },
    { name: "Agenda", icon: "📅", path: "/agenda" },
    ...(["admin", "gestor"].includes(user?.perfil) ? [{ name: "Usuários", icon: "👥", path: "/admin/users" }] : []),
  ];

  return (
    <div
      style={{
        width: "250px", // largura fixa da sidebar
        minWidth: "250px",
        flexShrink: 0,
        height: "100vh", // altura completa da tela
        background: "linear-gradient(180deg, #2c0b52, #4f238f)", // gradiente roxo
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: "25px 15px",
        borderRight: "1px solid rgba(255,255,255,0.05)", // linha separando do conteúdo
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        opacity: isOpen ? 1 : 0,
        transition: "transform 320ms ease, opacity 240ms ease",
        pointerEvents: isOpen ? "auto" : "none",
      }}
    >
      
      {/* Logo do sistema */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "40px",
          cursor: "pointer"
        }}
        onClick={() => navigate("/dashboard")} // Ao clicar, vai para dashboard
      >
        <div
          style={{
            width: "45px",
            height: "45px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, #9d4edd, #c77dff)", // gradiente roxo
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px"
          }}
        >
          🚀
        </div>
        <h2 style={{ margin: 0, fontWeight: "500" }}>Delivery</h2>
      </div>

      {/* Menu de navegação */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path; 
          // verifica se a rota atual é igual ao caminho do item
          return (
            <div
              key={index} // chave do item
              onClick={() => navigate(item.path)} // navega ao clicar
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 15px",
                borderRadius: "12px",
                cursor: "pointer",
                background: isActive
                  ? "linear-gradient(90deg, #6f3dde, #8a5dff)" // ativo
                  : "transparent", // inativo
                transition: "0.2s",
                fontSize: "14px"
              }}
              onMouseEnter={(e) => {
                if (!isActive) 
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)"; // hover
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = "transparent"; // volta ao normal
              }}
            >
              <span>{item.icon}</span> {/* Ícone do item */}
              <span>{item.name}</span> {/* Nome do item */}
            </div>
          );
        })}
      </div>

      {/* Footer da sidebar */}
      <div
        style={{
          marginTop: "auto", // posiciona no final da sidebar
          fontSize: "12px",
          opacity: 0.6, // mais transparente
          textAlign: "center"
        }}
      >
        © 2026 Delivery System
      </div>

    </div>
  );
}