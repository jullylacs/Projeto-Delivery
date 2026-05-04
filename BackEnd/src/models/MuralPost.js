const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Modelo para posts do mural interno
const MuralPost = sequelize.define("MuralPost", {
  autor: {
    type: DataTypes.STRING,
    allowNull: false
  },
  conteudo: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  data: {
    type: DataTypes.DATEONLY,
    allowNull: false
  }
}, {
  tableName: "mural_posts",
  timestamps: true // createdAt e updatedAt
});

module.exports = MuralPost;
