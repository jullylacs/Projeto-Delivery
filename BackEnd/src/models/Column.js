const mongoose = require("mongoose"); // Importa o Mongoose para modelagem do banco MongoDB

// 🔹 Define o schema da coluna do Kanban
const ColumnSchema = new mongoose.Schema({
  
  // Nome da coluna (ex: Novo, Em análise, Concluído)
  nome: String,

  // Ordem de exibição da coluna no Kanban (define a posição visual)
  ordem: Number,

  // Limite de cards permitidos na coluna (WIP - Work In Progress)
  limiteWip: Number

}, { 
  timestamps: true // Adiciona automaticamente:
  // createdAt -> data de criação
  // updatedAt -> última atualização
});

// Exporta o model para uso no sistema
module.exports = mongoose.model("Column", ColumnSchema);