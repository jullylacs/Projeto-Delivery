const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// 🔹 Model de técnicos
const Technician = sequelize.define("Technician", {

  // Nome completo do técnico
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },

  // Telefone de contato
  telefone: DataTypes.STRING,

  // Se está disponível para alocação
  ativo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }

}, {
  tableName: "technicians",
  timestamps: false // Técnico não precisa de controle de data de criação
});

module.exports = Technician;