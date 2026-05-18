"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("columns", "board", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "delivery",
    });

    // O índice antigo era unique global pelo nome normalizado. Agora unicidade
    // é por (board, nome normalizado) — Delivery e Comercial podem ter colunas
    // com o mesmo nome (ex.: "Novo" em ambos).
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS columns_nome_unique_ci;`);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX columns_board_nome_unique_ci
      ON "columns" (board, lower(btrim("nome")));
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS columns_board_nome_unique_ci;`);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX columns_nome_unique_ci
      ON "columns" (lower(btrim("nome")));
    `);
    await queryInterface.removeColumn("columns", "board");
  },
};
