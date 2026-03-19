const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  nome: String,
  email: String,
  senha: String,
  perfil: {
    type: String,
    enum: ["comercial", "operacional", "tecnico", "gestor", "admin"]
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);