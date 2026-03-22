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
  titulo: String,
  tipoServico: String,
  preco: Number,
  comments: [
    {
      text: String,
      author: String,
      createdAt: Date,
    }
  ],
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