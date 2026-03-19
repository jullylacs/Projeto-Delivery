export default function Header() {
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
      color: "#fff"
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
        
        {/* Busca */}
        <input
          type="text"
          placeholder="Buscar..."
          style={{
            padding: "10px 15px",
            borderRadius: "25px",
            border: "none",
            outline: "none",
            width: "220px",
            background: "rgba(255,255,255,0.1)",
            color: "#fff"
          }}
        />

        {/* Notificação */}
        <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer"
        }}>
          🔔
        </div>

        {/* Usuário */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer"
        }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #9d4edd6a, #c77dff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold"
          }}>
            JL
          </div>
          <span style={{ fontSize: "14px" }}>Júlia</span>
        </div>

      </div>
    </div>
  );
}