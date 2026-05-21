const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// 🔹 Model de eventos da Agenda de Delivery
// Cada evento pertence a um usuário (`usuario_id`). O escopo define se é
// individual (apenas o dono enxerga) ou geral (visível ao time de Delivery).
const AgendaEvento = sequelize.define(
  "AgendaEvento",
  {
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },

    titulo: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    // HTML sanitizado (sanitize-html) — produzido por editor rich text no front.
    descricao_html: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    inicio: {
      type: DataTypes.DATE, // TIMESTAMPTZ no Postgres
      allowNull: false,
    },

    fim: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    all_day: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    escopo: {
      type: DataTypes.ENUM("individual", "geral"),
      allowNull: false,
      defaultValue: "individual",
    },

    tipo: {
      type: DataTypes.ENUM("tarefa", "aviso", "programacao"),
      allowNull: false,
      defaultValue: "tarefa",
    },

    cor: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
  },
  {
    tableName: "agenda_eventos",
    timestamps: true,
  }
);

module.exports = AgendaEvento;
