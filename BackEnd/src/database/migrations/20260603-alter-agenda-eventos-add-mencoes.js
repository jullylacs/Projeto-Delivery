"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("agenda_eventos", "mencoes", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("agenda_eventos", "mencoes");
  },
};
