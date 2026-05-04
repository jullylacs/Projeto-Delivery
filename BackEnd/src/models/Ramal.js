const { DataTypes } = require("sequelize");
const { sequelize } = require("./index");

const Ramal = sequelize.define("Ramal", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  ramal: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  responsavel: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: "ramais",
  timestamps: false,
});

module.exports = Ramal;
