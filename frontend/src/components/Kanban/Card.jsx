export default function Card({ card, usuarioLogado }) {
  return (
    <div
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 12px 24px rgba(51, 34, 138, 0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.08)";
      }}
    >
      {/* Header */}
      <div style={styles.header}>
        <div>
          <strong style={styles.cliente}>
            {card.cliente || "Cliente"}
          </strong>

          {card.nome && (
            <p style={styles.nome}>
              {card.nome}
            </p>
          )}
        </div>

        {card.preco && (
          <div style={styles.precoBadge}>
            {formatarMoeda(card.preco)}
          </div>
        )}
      </div>

      {/* Endereço */}
      <p style={styles.endereco}>
        {card.endereco}
      </p>

      {/* Grid de informações */}
      <div style={styles.grid}>
        <Info label="📞 Telefone" value={card.telefone} />
        <Info label="🛠 Serviço" value={card.tipoServico} />
        <Info label="🌐 IP" value={card.ip} />
        <Info label="⏱ SLA" value={card.sla} />
        <Info label="📅 Prazo" value={card.prazo} />
        <Info label="👤 Vendedor" value={card.vendedor || usuarioLogado} />
      </div>

      {/* Coordenadas */}
      <p style={styles.coordenadas}>
        📍 {card.coordenadas?.lat}, {card.coordenadas?.lng}
      </p>

      {/* Observações */}
      {card.observacoes && (
        <div style={styles.obs}>
          📝 {card.observacoes}
        </div>
      )}
    </div>
  );
}

/* Componente auxiliar */
function Info({ label, value }) {
  if (!value) return null;

  return (
    <div style={styles.infoItem}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

/* Estilos */
const styles = {
  card: {
    background: "#ffffff",
    padding: "14px",
    marginBottom: "12px",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    cursor: "pointer"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "6px"
  },

  cliente: {
    color: "var(--primary)",
    fontSize: "15px"
  },

  nome: {
    margin: "2px 0 0",
    fontSize: "13px",
    color: "#555",
    fontWeight: "500"
  },

  precoBadge: {
    background: "#e8f5e9",
    color: "#2e7d32",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "bold"
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
    color: "#888"
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
    background: "#f9f9f9",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#555"
  }
};

/* Formatação moeda */
function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}