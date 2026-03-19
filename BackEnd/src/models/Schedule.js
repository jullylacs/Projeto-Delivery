const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema({
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Card"
  },
  tecnico: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Technician"
  },
  data: Date,
  horario: String,
  janela: String,
  status: {
    type: String,
    enum: ["pendente", "confirmado", "reagendado", "em_execucao", "finalizado"]
  },
  motivoReagendamento: String
}, { timestamps: true });

module.exports = mongoose.model("Schedule", ScheduleSchema);