"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("columns", {
      id:        { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome:      { type: Sequelize.STRING, allowNull: false },
      ordem:     { type: Sequelize.INTEGER, defaultValue: 0 },
      limiteWip: { type: Sequelize.INTEGER },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("columns");
  }
};