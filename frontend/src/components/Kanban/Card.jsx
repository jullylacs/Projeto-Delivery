export default function Card({ card, usuarioLogado }) {
  return (
    <div
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-5px)";
        e.currentTarget.style.boxShadow =
          "0 12px 24px rgba(108,59,255,0.3), 0 0 15px rgba(108,59,255,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.08)";
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div>
          <strong style={styles.cliente}>{card.cliente || "Cliente"}</strong>
          {card.nome && <p style={styles.nome}>{card.nome}</p>}
        </div>

        {card.preco && (
          <div style={styles.precoBadge}>{formatarMoeda(card.preco)}</div>
        )}
      </div>

      {/* Endereço */}
      <p style={styles.endereco}>{card.endereco}</p>

      {/* Grid de informações */}
      <div style={styles.grid}>
        <Info label="📞 Telefone" value={card.telefone} />
        <Info label="🛠 Serviço" value={card.tipoServico} />
        <Info label="🌐 IP" value={card.ip} iconColor="#6c3bff" />
        <Info label="⏱ SLA" value={card.sla} iconColor="#6c3bff" />
        <Info label="📅 Prazo" value={card.prazo} iconColor="#6c3bff" />
        <Info label="👤 Vendedor" value={card.vendedor || usuarioLogado} />
      </div>

      {/* Coordenadas */}
      <p style={styles.coordenadas}>
        📍 {card.coordenadas?.lat}, {card.coordenadas?.lng}
      </p>

      {/* Observações */}
      {card.observacoes && <div style={styles.obs}>📝 {card.observacoes}</div>}
    </div>
  );
}

function Info({ label, value, iconColor }) {
  if (!value) return null;
  return (
    <div style={styles.infoItem}>
      <span style={{ ...styles.infoLabel, color: iconColor || "#6c3bff" }}>
        {label}
      </span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    padding: "14px",
    marginBottom: "12px",
    borderRadius: "12px",
    boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
    transition: "transform 0.25s ease, box-shadow 0.25s ease",
    cursor: "pointer",
    border: "1px solid #e0dfff"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "6px"
  },

  cliente: {
    color: "#6c3bff",
    fontSize: "15px",
    fontWeight: "600"
  },

  nome: {
    margin: "2px 0 0",
    fontSize: "13px",
    color: "#555",
    fontWeight: "500"
  },

  precoBadge: {
    background: "linear-gradient(90deg, #6c3bff, #8b64ff)",
    color: "#fff",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    textAlign: "center"
  },

  endereco: {
    margin: "4px 0 10px",
    fontSize: "13px",
    color: "#444"
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "6px 10px",
    marginBottom: "8px"
  },

  infoItem: {
    display: "flex",
    flexDirection: "column",
    fontSize: "12px"
  },

  infoLabel: {
    fontWeight: "500",
    marginBottom: "2px"
  },

  infoValue: {
    color: "#222",
    fontWeight: "500"
  },

  coordenadas: {
    fontSize: "11px",
    color: "#777",
    marginTop: "4px"
  },

  obs: {
    marginTop: "8px",
    padding: "6px",
    background: "#f5f0ff",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#555"
  }
};

function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}