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
    type: DataTypes.ENUM("convidado", "comercial", "operacional", "tecnico", "delivery", "gestor", "admin"),
    defaultValue: "convidado"
  },

  // Controle de aprovação de novos cadastros
  aprovado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  aprovado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  aprovado_em: {
    type: DataTypes.DATE,
    allowNull: true,
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