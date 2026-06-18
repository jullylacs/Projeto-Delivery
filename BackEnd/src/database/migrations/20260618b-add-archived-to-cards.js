"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("cards", "arquivado_em", {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn("cards", "arquivado_por_nome", {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("cards", "arquivado_em");
    await queryInterface.removeColumn("cards", "arquivado_por_nome");
  },
};
