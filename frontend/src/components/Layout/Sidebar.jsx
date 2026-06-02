import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar({ isOpen = true }) {
  const navigate = useNavigate();
  const location = useLocation();
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  const canSeeAgendaDelivery = ["delivery", "admin", "noc"].includes(user?.perfil);

  const menuItems = [
    { name: "Dashboard",       icon: "⊞",  path: "/dashboard" },
    { name: "Gráficos",        icon: "◈",  path: "/graficos" },
    { name: "Kanban",          icon: "⬡",  path: "/kanban" },
    { name: "Agenda",          icon: "◷",  path: "/agenda" },
    ...(canSeeAgendaDelivery ? [{ name: "Agenda Geral", icon: "⬡", path: "/agenda-delivery" }] : []),
    { name: "Ramais",          icon: "✆",  path: "/ramais" },
    { name: "Mural",           icon: "◈",  path: "/mural" },
    ...(["admin", "gestor"].includes(user?.perfil) ? [{ name: "Usuários", icon: "◉", path: "/admin/users" }] : []),
  ];

  const emojiMap = {
    "/dashboard":       "📊",
    "/graficos":        "📈",
    "/kanban":          "🗂️",
    "/agenda":          "📅",
    "/agenda-delivery": "🛵",
    "/ramais":          "📞",
    "/mural":           "📝",
    "/admin/users":     "👥",
  };

  return (
    <div
      style={{
        width: "250px",
        minWidth: "250px",
        flexShrink: 0,
        height: "100vh",
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #1e0638 0%, #2c0b52 35%, #3d1472 70%, #4f238f 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: "0",
        borderRight: "1px solid rgba(255,255,255,0.04)",
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        opacity: isOpen ? 1 : 0,
        transition: "transform 320ms cubic-bezier(0.4,0,0.2,1), opacity 240ms ease",
        pointerEvents: isOpen ? "auto" : "none",
        boxShadow: "4px 0 24px rgba(0,0,0,0.25)",
      }}
    >
      {/* Logo */}
      <div
        onClick={() => navigate("/dashboard")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "24px 20px 20px",
          cursor: "pointer",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "11px",
            background: "linear-gradient(135deg, #7a4dff, #c77dff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(124,77,255,0.45)",
          }}
        >
          🚀
        </div>
        <div>
          <div style={{ fontWeight: "700", fontSize: "15px", letterSpacing: "0.3px", lineHeight: 1.2 }}>
            Delivery
          </div>
          <div style={{ fontSize: "11px", opacity: 0.5, letterSpacing: "0.5px", marginTop: "2px" }}>
            NVX Fibra LTDA
          </div>
        </div>
      </div>

      {/* Menu */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", padding: "8px 12px", flex: 1 }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <div
              key={index}
              onClick={() => navigate(item.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                padding: "10px 12px",
                borderRadius: "10px",
                cursor: "pointer",
                background: isActive
                  ? "rgba(255,255,255,0.12)"
                  : "transparent",
                transition: "background 180ms ease, transform 120ms ease",
                fontSize: "13.5px",
                fontWeight: isActive ? "600" : "400",
                letterSpacing: "0.15px",
                position: "relative",
                borderLeft: isActive ? "3px solid #c77dff" : "3px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.07)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: "16px", width: "20px", textAlign: "center", flexShrink: 0 }}>
                {emojiMap[item.path] || item.icon}
              </span>
              <span style={{ opacity: isActive ? 1 : 0.82 }}>{item.name}</span>
              {isActive && (
                <div style={{
                  marginLeft: "auto",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#c77dff",
                  boxShadow: "0 0 6px #c77dff",
                  flexShrink: 0,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: "11px",
          opacity: 0.35,
          textAlign: "center",
          letterSpacing: "0.4px",
        }}
      >
        © 2026 Delivery System - By Júlia and Eduardo
      </div>
    </div>
  );
}
