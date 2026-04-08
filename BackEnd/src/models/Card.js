const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// 🔹 Model de cards do Kanban
const Card = sequelize.define("Card", {

  // Nome do cliente
  cliente: DataTypes.STRING,

  // Telefone de contato do cliente
  telefone: DataTypes.STRING,

  // Endereço completo da instalação
  endereco: DataTypes.STRING,

  // Coordenadas geográficas armazenadas como JSONB
  // Mantém compatibilidade com o frontend: card.coordenadas.lat / card.coordenadas.lng
  coordenadas: {
    type: DataTypes.JSONB,
    defaultValue: null
    // Estrutura esperada: { lat: Number, lng: Number }
  },

  // Título/resumo da demanda
  titulo: DataTypes.STRING,

  // Tipo de serviço (DIA, BIA, L2L, etc.)
  tipoServico: DataTypes.STRING,

  // Preço/valor do serviço
  preco: DataTypes.DECIMAL(10, 2),

  // IP relacionado ao serviço
  ip: DataTypes.STRING,

  // SLA acordado (em horas ou dias)
  sla: DataTypes.INTEGER,

  // Prazo contratual
  prazo: DataTypes.DATE,

  // Referência à coluna real no banco
  coluna_id: {
    type: DataTypes.INTEGER,
    references: {
      model: "columns",
      key: "id"
    },
    onDelete: "SET NULL",
    allowNull: true
  },

  // Observações adicionais
  observacoes: DataTypes.TEXT,

  // Comentários embutidos no card (JSONB array)
  // Cada item: { id, text, author, authorAvatar, createdAt, attachment? }
  comments: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },

  // Referência ao usuário (vendedor) que criou o card
  // Equivalente ao: vendedor: { type: ObjectId, ref: "User" } do Mongoose
  vendedor_id: {
    type: DataTypes.INTEGER,
    references: {
      model: "users",
      key: "id"
    },
    onDelete: "SET NULL",
    allowNull: true
  }

}, {
  tableName: "cards",
  timestamps: true // createdAt e updatedAt automáticos
});

module.exports = Card;