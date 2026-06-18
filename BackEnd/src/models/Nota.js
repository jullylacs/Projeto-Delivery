const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Nota = sequelize.define("Nota", {
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  titulo:     { type: DataTypes.STRING(500), allowNull: true, defaultValue: "" },
  conteudo:   { type: DataTypes.TEXT,        allowNull: true, defaultValue: "" },
  cor:        { type: DataTypes.STRING(20),  allowNull: true, defaultValue: "default" },
  favorita:   { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: false },
}, {
  tableName: "notas",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = Nota;
