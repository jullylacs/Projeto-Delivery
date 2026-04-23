"use strict";

const DEFAULT_COLUMNS = [
  "Novo",
  "Em análise",
  "Agendamento",
  "Agendado",
  "Em execução",
  "Concluído",
  "Inativo",
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("columns", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome: { type: Sequelize.STRING, allowNull: false },
      ordem: { type: Sequelize.INTEGER, defaultValue: 0 },
      limiteWip: { type: Sequelize.INTEGER },

      // ORDEM CORRETA
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX columns_nome_unique_ci
      ON "columns" (lower(btrim("nome")));
    `);

    const now = new Date();
    await queryInterface.bulkInsert(
      "columns",
      DEFAULT_COLUMNS.map((nome, index) => ({
        nome,
        ordem: index,
        limiteWip: null,
        createdAt: now,
        updatedAt: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS columns_nome_unique_ci;`);
    await queryInterface.dropTable("columns");
  },
};