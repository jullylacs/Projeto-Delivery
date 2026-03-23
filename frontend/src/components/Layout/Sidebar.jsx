import { useNavigate, useLocation } from "react-router-dom";

// Componente da barra lateral com menu de navegação
export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", icon: "📊", path: "/dashboard" },
    { name: "Kanban", icon: "🗂️", path: "/kanban" },
    { name: "Agenda", icon: "📅", path: "/agenda" },
  ];

  return (
    <div style={{
      width: "250px",
      height: "100vh",
      background: "linear-gradient(180deg, #240046, #3c096c)",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      padding: "25px 15px",
      borderRight: "1px solid rgba(255,255,255,0.05)"
    }}>
      
      {/* Logo */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "40px",
        cursor: "pointer"
      }}
      onClick={() => navigate("/dashboard")}
      >
        <div style={{
          width: "45px",
          height: "45px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #9d4edd, #c77dff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px"
        }}>
          🚀
        </div>
        <h2 style={{ margin: 0, fontWeight: "500" }}>
          Delivery
        </h2>
      </div>

      {/* Menu */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <div
              key={index}
              onClick={() => navigate(item.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 15px",
                borderRadius: "12px",
                cursor: "pointer",
                background: isActive 
                  ? "linear-gradient(90deg, #7a2cbf8f, #9d4edd6c)" 
                  : "transparent",
                transition: "0.2s",
                fontSize: "14px"
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </div>
          );
        })}

      </div>

      {/* Footer */}
      <div style={{
        marginTop: "auto",
        fontSize: "12px",
        opacity: 0.6,
        textAlign: "center"
      }}>
        © 2026 Delivery System
      </div>

    </div>
  );
}