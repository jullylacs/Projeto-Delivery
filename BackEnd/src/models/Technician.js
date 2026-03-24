const mongoose = require("mongoose"); // Importa o Mongoose para modelagem do MongoDB

// 🔹 Define o schema de técnicos
const TechnicianSchema = new mongoose.Schema({

  // Nome completo do técnico
  nome: String,

  // Telefone de contato
  telefone: String,

  // Status de ativo/inativo (para alocação de agendamentos)
  ativo: Boolean

});

// Exporta o model para uso no sistema
module.exports = mongoose.model("Technician", TechnicianSchema);