const mongoose = require("mongoose"); // Importa o Mongoose para modelagem do MongoDB

// 🔹 Define o schema do Card (estrutura do documento no banco)
const CardSchema = new mongoose.Schema({
  
  // Nome do cliente
  cliente: String,

  // Telefone de contato do cliente
  telefone: String,

  // Endereço completo da instalação/atendimento
  endereco: String,

  // Coordenadas geográficas (usado para mapa/rota)
  coordenadas: {
    lat: Number, // Latitude
    lng: Number  // Longitude
  },

  // Referência ao usuário (vendedor) que criou o card
  vendedor: {
    type: mongoose.Schema.Types.ObjectId, // ID do documento
    ref: "User" // Faz relação com a coleção "User"
  },

  // Título do card (resumo da demanda)
  titulo: String,

  // Tipo de serviço (ex: DIA, BIA, L2L)
  tipoServico: String,

  // Valor/preço do serviço
  preco: Number,

  // Lista de comentários associados ao card
  comments: [
    {
      text: String,       // Conteúdo do comentário
      author: String,     // Autor do comentário (nome ou ID)
      createdAt: Date,    // Data de criação do comentário
    }
  ],

  // IP relacionado ao serviço
  ip: String,

  // SLA (tempo acordado para execução, geralmente em horas ou dias)
  sla: Number,

  // Prazo contratual para conclusão
  prazo: Date,

  // Status atual do card
  status: {
    type: String,
    default: "Novo" // Valor padrão ao criar o card
  },

  // Nome da coluna do Kanban onde o card está
  coluna: String,

  // Observações adicionais
  observacoes: String

}, 
{ 
  timestamps: true // Adiciona automaticamente:
  // createdAt -> data de criação
  // updatedAt -> data da última atualização
});

// Exporta o model para uso no sistema
module.exports = mongoose.model("Card", CardSchema);