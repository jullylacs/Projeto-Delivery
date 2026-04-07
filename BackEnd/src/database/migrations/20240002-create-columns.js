"use strict";

// Migration: cria a tabela de colunas do Kanban
module.exports = {
  // Executa a criação da tabela ao rodar `sequelize db:migrate`
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("columns", {
      id:        { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome:      { type: Sequelize.STRING, allowNull: false },   // nome da coluna (ex: "Em Análise")
      ordem:     { type: Sequelize.INTEGER, defaultValue: 0 },   // posição no board
      limiteWip: { type: Sequelize.INTEGER },                    // limite de cards (Work In Progress)
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  // Desfaz a migration ao rodar `sequelize db:migrate:undo`
  async down(queryInterface) {
    await queryInterface.dropTable("columns");
  }
};