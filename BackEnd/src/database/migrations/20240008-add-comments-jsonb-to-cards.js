"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("cards", "comments", {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("cards", "comments");
  },
};
