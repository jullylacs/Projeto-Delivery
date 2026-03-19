const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema({
  cliente: String,
  telefone: String,
  endereco: String,
  coordenadas: {
    lat: Number,
    lng: Number
  },
  vendedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  tipoServico: String,
  ip: String,
  sla: Number,
  prazo: Date,
  status: {
    type: String,
    default: "Novo"
  },
  coluna: String,
  observacoes: String
}, { timestamps: true });

module.exports = mongoose.model("Card", CardSchema);