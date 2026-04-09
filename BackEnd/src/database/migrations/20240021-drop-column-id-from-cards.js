"use strict";

module.exports = {
  async up(queryInterface) {
    const table = await queryInterface.describeTable("cards");

    if (table.column_id) {
      await queryInterface.removeColumn("cards", "column_id");
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("cards");

    if (!table.column_id) {
      await queryInterface.addColumn("cards", "column_id", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },
};
