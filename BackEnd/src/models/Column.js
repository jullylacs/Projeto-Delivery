const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// 🔹 Model de colunas do Kanban
const Column = sequelize.define("Column", {

  // Nome da coluna (ex: Novo, Em análise, Concluído).
  // Unicidade é por (board, lower(btrim(nome))) — ver índice columns_board_nome_unique_ci.
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 120],
    }
  },

  // Qual Kanban a coluna pertence. Cards herdam o board pela coluna.
  board: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "delivery",
    validate: {
      isIn: [["delivery", "comercial"]],
    },
  },

  // Posição de exibição no Kanban (escopo por board)
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