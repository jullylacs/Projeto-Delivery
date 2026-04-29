export default function Card({ card, usuarioLogado }) {
  // Componente principal que representa um card do Kanban
  // Recebe props:
  // - card: objeto com informações do card
  // - usuarioLogado: informações do usuário logado (usado como fallback)

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
      {/* Identificação do Card (Venda, Cotação, POC) */}
      {card.tipo_card && (
        <div style={{
          background: '#e7e3ff',
          color: '#5a30ff',
          fontWeight: 700,
          fontSize: 13,
          borderRadius: 10,
          padding: '4px 16px',
          marginBottom: 8,
          display: 'inline-block',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          border: '1px solid #cfc2ff',
          alignSelf: 'flex-start',
        }}>
          {card.tipo_card}
        </div>
      )}
      {/* Header */}
      <div style={styles.header}>
        <div>
          {/* Nome do cliente */}
          <strong style={styles.cliente}>{card.cliente || "Cliente"}</strong>

          {/* Nome adicional do card, se existir */}
          {card.nome && <p style={styles.nome}>{card.nome}</p>}
        </div>

        {/* Badge de mensalidade, se existir */}
        {card.mensalidade && (
          <div style={styles.precoBadge}>Mensalidade: {formatarMoeda(card.mensalidade)}</div>
        )}
        {/* Badge de instalação, se existir */}
        {card.instalacao && (
          <div style={styles.precoBadge}>Instalação: {formatarMoeda(card.instalacao)}</div>
        )}
      </div>

      {/* Endereço do cliente */}
      <p style={styles.endereco}>{card.endereco}</p>

      {/* Grid com informações adicionais */}
      <div style={styles.grid}>
        {/* Componente Info para exibir label + valor */}
        <Info label="📞 Telefone" value={card.telefone} />
        <Info label="🛠 Serviço" value={card.tipoServico} />
        <Info label="💸 Mensalidade" value={card.mensalidade ? formatarMoeda(card.mensalidade) : undefined} iconColor="#6c3bff" />
        <Info label="💰 Instalação" value={card.instalacao ? formatarMoeda(card.instalacao) : undefined} iconColor="#6c3bff" />
        <Info label="🌐 IP" value={card.ip} iconColor="#6c3bff" />
        <Info label="⏱ SLA" value={card.sla ? `${String(card.sla).replace(/[^\d]/g, '')} horas` : undefined} iconColor="#6c3bff" />
        <Info label="📄 Tempo Contratual" value={card.tempoContratual ? `${card.tempoContratual} meses` : undefined} iconColor="#6c3bff" />
        {/* Prazo removido */}
        <Info label="👤 Vendedor" value={card.vendedor || usuarioLogado} />
        {/* O vendedor será o do card ou, se não houver, o usuário logado */}
      </div>

      {/* Coordenadas geográficas do card */}
      <p style={styles.coordenadas}>
        📍 {card.coordenadas?.lat}, {card.coordenadas?.lng}
      </p>

      {/* Observações adicionais, se houver */}
      {card.observacoes && <div style={styles.obs}>📝 {card.observacoes}</div>}
    </div>
  );
}

// Componente auxiliar para exibir label + valor
function Info({ label, value, iconColor }) {
  // Se não houver valor, não renderiza nada
  if (!value) return null;

  return (
    <div style={styles.infoItem}>
      {/* Label do campo, cor personalizada se fornecida */}
      <span style={{ ...styles.infoLabel, color: iconColor || "#6c3bff" }}>
        {label}
      </span>

      {/* Valor do campo */}
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

// Objeto com todos os estilos do componente
const styles = {
  card: {
    background: "#fff", // Fundo branco
    padding: "24px 18px", // Espaçamento interno aumentado
    marginBottom: "16px", // Margem inferior entre cards
    borderRadius: "16px", // Bordas mais arredondadas
    boxShadow: "0 6px 18px rgba(0,0,0,0.10)", // Sombra levemente maior
    transition: "transform 0.25s ease, box-shadow 0.25s ease", // Animação suave ao passar o mouse
    cursor: "pointer", // Cursor de clique
    border: "1px solid #e0dfff", // Borda suave roxa
    minHeight: "220px", // Altura mínima maior para detalhamento
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between"
  },

  header: {
    display: "flex", // Flexbox para separar cliente e preço
    justifyContent: "space-between", // Espaço entre cliente e preço
    alignItems: "flex-start", // Alinha ao topo
    marginBottom: "6px" // Espaço abaixo do header
  },

  cliente: {
    color: "#6c3bff", // Roxo
    fontSize: "15px",
    fontWeight: "600"
  },

  nome: {
    margin: "2px 0 0", // Pequena margem acima
    fontSize: "13px",
    color: "#555",
    fontWeight: "500"
  },

  precoBadge: {
    background: "linear-gradient(90deg, #6c3bff, #8b64ff)", // Gradiente roxo
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
    display: "grid", // Grid para organizar informações
    gridTemplateColumns: "1fr 1fr", // Duas colunas iguais
    gap: "6px 10px", // Espaçamento entre itens
    marginBottom: "8px"
  },

  infoItem: {
    display: "flex",
    flexDirection: "column", // Label acima do valor
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
    background: "#f5f0ff", // Fundo lilás suave
    borderRadius: "6px",
    fontSize: "12px",
    color: "#555"
  }
};

// Função para formatar valores numéricos em moeda brasileira
function formatarMoeda(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}