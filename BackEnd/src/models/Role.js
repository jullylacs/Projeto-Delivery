const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Model de cargos customizados
const Role = sequelize.define(
  "Role",
  {
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    descricao: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "roles",
    timestamps: true,
  }
);

module.exports = Role;
