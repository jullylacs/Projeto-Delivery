const mongoose = require("mongoose");

const ColumnSchema = new mongoose.Schema({
  nome: String,
  ordem: Number,
  limiteWip: Number
}, { timestamps: true });

module.exports = mongoose.model("Column", ColumnSchema);