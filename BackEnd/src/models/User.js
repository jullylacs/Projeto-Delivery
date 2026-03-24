const mongoose = require("mongoose"); // Importa o Mongoose para modelagem do MongoDB

// 🔹 Define o schema de usuários do sistema
const UserSchema = new mongoose.Schema({

  // Nome completo do usuário
  nome: String,

  // Email do usuário (usado para login e contato)
  email: String,

  // Senha do usuário (ATUALMENTE em texto puro — muito perigoso!)
  senha: String,

  // Perfil/role do usuário (define permissões)
  perfil: {
    type: String,
    // Valores permitidos
    enum: ["comercial", "operacional", "tecnico", "gestor", "admin"]
  }

}, { 
  timestamps: true // Adiciona automaticamente:
  // createdAt -> data de criação
  // updatedAt -> última atualização
});

// Exporta o model para uso no sistema
module.exports = mongoose.model("User", UserSchema);