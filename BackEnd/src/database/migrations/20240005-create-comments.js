"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("comments", {
      id:      { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mensagem:{ type: Sequelize.TEXT, allowNull: false },
      card_id: {
        type: Sequelize.INTEGER,
        references: { model: "cards", key: "id" },
        onDelete: "CASCADE",
        allowNull: false
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
        allowNull: true
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("comments");
  }
};