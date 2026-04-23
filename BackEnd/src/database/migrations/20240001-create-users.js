"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable("users", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, allowNull: false },
      senha: { type: Sequelize.STRING, allowNull: false },

      perfil: {
        type: Sequelize.ENUM("convidado", "comercial", "operacional", "tecnico", "gestor", "admin", "delivery"),
        allowNull: false,
        defaultValue: "convidado",
      },

      telefone: { type: Sequelize.STRING },
      departamento: { type: Sequelize.STRING },
      avatar: { type: Sequelize.TEXT },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },

      statusConta: {
        type: Sequelize.ENUM("pendente", "ativo", "inativo"),
        allowNull: false,
        defaultValue: "pendente",
      },

      emailConfirmado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      emailConfirmToken: { type: Sequelize.STRING },
      emailConfirmExpiraEm: { type: Sequelize.DATE },

      aprovado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      aprovado_por: { type: Sequelize.INTEGER },
      aprovado_em: { type: Sequelize.DATE },

      email_verificado: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      email_verificado_token: { type: Sequelize.STRING },
      email_verificado_token_expires: { type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("users");
  },
};