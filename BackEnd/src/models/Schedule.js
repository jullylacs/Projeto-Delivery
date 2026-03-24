const mongoose = require("mongoose"); // Importa o Mongoose para modelagem do MongoDB

// 🔹 Schema de agendamento de instalações
const ScheduleSchema = new mongoose.Schema({

  // Referência ao card (demanda) vinculada ao agendamento
  card: {
    type: mongoose.Schema.Types.ObjectId, // ID do documento
    ref: "Card" // Relaciona com a coleção "Card"
  },

  // Referência ao técnico responsável pela execução
  tecnico: {
    type: mongoose.Schema.Types.ObjectId, // ID do técnico
    ref: "Technician" // Relaciona com a coleção "Technician"
  },

  // Data da instalação
  data: Date,

  // Horário específico (ex: "08:00")
  horario: String,

  // Janela de atendimento (ex: "08h–12h")
  janela: String,

  // Status do agendamento
  status: {
    type: String,
    // Define valores permitidos (evita inconsistência)
    enum: ["pendente", "confirmado", "reagendado", "em_execucao", "finalizado"]
  },

  // Motivo do reagendamento (usado quando status = reagendado)
  motivoReagendamento: String

}, { 
  timestamps: true // Adiciona automaticamente:
  // createdAt -> data de criação
  // updatedAt -> última atualização
});

// Exporta o model
module.exports = mongoose.model("Schedule", ScheduleSchema);