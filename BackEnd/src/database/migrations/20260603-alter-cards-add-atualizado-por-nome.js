"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("cards", "atualizado_por_nome", {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("cards", "atualizado_por_nome");
  },
};
