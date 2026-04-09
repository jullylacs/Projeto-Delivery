"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("schedules", "titulo", {
      type: Sequelize.STRING,
      allowNull: true,
    }).catch(() => {});

    await queryInterface.addColumn("schedules", "notas", {
      type: Sequelize.TEXT,
      allowNull: true,
    }).catch(() => {});

    await queryInterface.changeColumn("schedules", "card_id", {
      type: Sequelize.INTEGER,
      references: { model: "cards", key: "id" },
      onDelete: "CASCADE",
      allowNull: true,
    }).catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("schedules", "card_id", {
      type: Sequelize.INTEGER,
      references: { model: "cards", key: "id" },
      onDelete: "CASCADE",
      allowNull: false,
    }).catch(() => {});

    await queryInterface.removeColumn("schedules", "notas").catch(() => {});
    await queryInterface.removeColumn("schedules", "titulo").catch(() => {});
  },
};