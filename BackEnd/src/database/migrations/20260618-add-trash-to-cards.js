"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("cards", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn("cards", "excluido_por_nome", {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("cards", "deleted_at");
    await queryInterface.removeColumn("cards", "excluido_por_nome");
  },
};
