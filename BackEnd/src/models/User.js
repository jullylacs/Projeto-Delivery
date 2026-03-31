const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// 🔹 Model de usuários do sistema
const User = sequelize.define("User", {

  // Nome completo do usuário
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },

  // Email único (usado para login)
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  // Senha (hash recomendado — manter bcrypt em implementação futura)
  senha: {
    type: DataTypes.STRING,
    allowNull: false
  },

  // Perfil/role do usuário
  perfil: {
    type: DataTypes.ENUM("comercial", "operacional", "tecnico", "gestor", "admin"),
    defaultValue: "comercial"
  },

  // Campos adicionais usados no updateUserProfile
  telefone: DataTypes.STRING,
  departamento: DataTypes.STRING,
  avatar: DataTypes.TEXT

}, {
  tableName: "users",
  timestamps: true // createdAt e updatedAt automáticos
});

module.exports = User;