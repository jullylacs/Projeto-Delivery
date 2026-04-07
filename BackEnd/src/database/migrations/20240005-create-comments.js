"use strict";

// Migration: cria a tabela de comentários vinculados a cards e usuários
module.exports = {
  // Executa a criação da tabela ao rodar `sequelize db:migrate`
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("comments", {
      id:      { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      mensagem:{ type: Sequelize.TEXT, allowNull: false }, // conteúdo do comentário
      card_id: {
        type: Sequelize.INTEGER,
        references: { model: "cards", key: "id" },
        onDelete: "CASCADE", // ao excluir o card, apaga todos os comentários
        allowNull: false
      },
      usuario_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL", // ao excluir o usuário, mantém o comentário sem autor
        allowNull: true
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  // Desfaz a migration ao rodar `sequelize db:migrate:undo`
  async down(queryInterface) {
    await queryInterface.dropTable("comments");
  }
};