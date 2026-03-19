const mongoose = require("mongoose");

const TechnicianSchema = new mongoose.Schema({
  nome: String,
  telefone: String,
  ativo: Boolean
});

module.exports = mongoose.model("Technician", TechnicianSchema);