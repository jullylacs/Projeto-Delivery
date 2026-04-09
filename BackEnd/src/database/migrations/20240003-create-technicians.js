"use strict";

// Migration: cria a tabela de técnicos
module.exports = {
  // Executa a criação da tabela ao rodar `sequelize db:migrate`
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("technicians", {
      id:       { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome:     { type: Sequelize.STRING, allowNull: false }, // nome completo do técnico
      telefone: { type: Sequelize.STRING },                  // contato do técnico
      ativo:    { type: Sequelize.BOOLEAN, defaultValue: true } // indica disponibilidade
    });
  },
  // Desfaz a migration ao rodar `sequelize db:migrate:undo`
  async down(queryInterface) {
    await queryInterface.dropTable("technicians");
  }
};