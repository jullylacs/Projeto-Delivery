const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// 🔹 Model de colunas do Kanban
const Column = sequelize.define("Column", {

  // Nome da coluna (ex: Novo, Em análise, Concluído)
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },

  // Posição de exibição no Kanban
  ordem: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  // Limite WIP (Work In Progress) — null = sem limite
  limiteWip: {
    type: DataTypes.INTEGER,
    allowNull: true
  }

}, {
  tableName: "columns",
  timestamps: true
});

module.exports = Column;