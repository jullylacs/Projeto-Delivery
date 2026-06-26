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
    type: DataTypes.ENUM("convidado", "comercial", "operacional", "tecnico", "delivery", "gestor", "gestor_delivery", "admin", "bko", "noc", "compras"),
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

  /*
   * Flags de acesso ao Kanban — independentes do campo `perfil`.
   *
   * Um usuário com perfil "comercial" não tem acesso ao board de Delivery
   * automaticamente; precisa que um admin ative a flag correspondente.
   * Isso permite configuração granular: um usuário pode ter perfil "delivery"
   * mas acesso simultâneo ao board "comercial" se o admin assim permitir.
   *
   * O frontend lê essas flags diretamente do objeto `user` no localStorage
   * (atualizado via GET /users/:id ao carregar o Kanban) para montar as abas
   * disponíveis. Nunca confie apenas no `perfil` para essa decisão.
   */
  acesso_kanban_delivery: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  acesso_kanban_comercial: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  acesso_kanban_bko: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  acesso_kanban_compras: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
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