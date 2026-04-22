"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("technicians", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome: { type: Sequelize.STRING, allowNull: false },
      telefone: { type: Sequelize.STRING },
      ativo: { type: Sequelize.BOOLEAN, defaultValue: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("technicians");
  },
};