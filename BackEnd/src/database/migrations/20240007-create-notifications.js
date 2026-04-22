"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable("notifications", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

      tipo: {
        type: Sequelize.ENUM(
          "mention",
          "sla_due",
          "sla_late",
          "system",
          "registration_request"
        ),
        allowNull: false,
        defaultValue: "system",
      },

      titulo: { type: Sequelize.STRING, allowNull: false },
      mensagem: { type: Sequelize.TEXT, allowNull: false },

      metadata: { type: Sequelize.JSONB, defaultValue: {} },

      lida: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      lidaEm: { type: Sequelize.DATE },

      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
      },

      card_id: {
        type: Sequelize.INTEGER,
        references: { model: "cards", key: "id" },
      },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },

      limpa: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      limpaEm: { type: Sequelize.DATE },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notifications");
  },
};