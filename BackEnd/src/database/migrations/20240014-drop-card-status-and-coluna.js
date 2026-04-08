"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("cards");

    if (table.status) {
      await queryInterface.removeColumn("cards", "status").catch(() => {});
    }

    if (table.coluna) {
      await queryInterface.removeColumn("cards", "coluna").catch(() => {});
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("cards");

    if (!table.status) {
      await queryInterface.addColumn("cards", "status", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "Novo",
      }).catch(() => {});
    }

    if (!table.coluna) {
      await queryInterface.addColumn("cards", "coluna", {
        type: Sequelize.STRING,
        allowNull: true,
      }).catch(() => {});
    }

    await queryInterface.sequelize.query(`
      UPDATE "cards" c
      SET "status" = col."nome",
          "coluna" = col."nome"
      FROM "columns" col
      WHERE c."coluna_id" = col.id;
    `).catch(() => {});
  },
};
