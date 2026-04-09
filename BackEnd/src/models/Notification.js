const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Notification = sequelize.define(
  "Notification",
  {
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "info",
    },
    titulo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mensagem: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    lida: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lidaEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    limpa: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    limpaEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    card_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "notifications",
    timestamps: true,
  }
);

module.exports = Notification;
