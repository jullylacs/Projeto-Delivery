const mongoose = require("mongoose"); // Importa o Mongoose para modelagem do MongoDB

// 🔹 Define o schema de comentários (separado do Card - melhor para escala)
const CommentSchema = new mongoose.Schema({

  // Referência ao card ao qual o comentário pertence
  card: {
    type: mongoose.Schema.Types.ObjectId, // ID do documento
    ref: "Card" // Relaciona com a coleção "Card"
  },

  // Referência ao usuário que fez o comentário
  usuario: {
    type: mongoose.Schema.Types.ObjectId, // ID do usuário
    ref: "User" // Relaciona com a coleção "User"
  },

  // Conteúdo da mensagem do comentário
  mensagem: String

}, { 
  timestamps: true // Adiciona automaticamente:
  // createdAt -> data de criação
  // updatedAt -> data da última edição
});

// Exporta o model para uso no sistema
module.exports = mongoose.model("Comment", CommentSchema);