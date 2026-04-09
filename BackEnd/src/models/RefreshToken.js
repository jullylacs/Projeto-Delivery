const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    expiraEm: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revogadoEm: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "refresh_tokens",
    timestamps: true,
  }
);

module.exports = RefreshToken;
