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
    await queryInterface.addColumn("cards", "coluna_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "columns", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    }).catch(() => {});

    await queryInterface.addIndex("columns", ["nome"], {
      name: "columns_nome_unique",
      unique: true,
    }).catch(() => {});

    const [existingColumns] = await queryInterface.sequelize.query(
      'SELECT id, nome FROM "columns" ORDER BY "ordem" ASC, id ASC'
    );

    if (!Array.isArray(existingColumns) || existingColumns.length === 0) {
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
    }

    await queryInterface.sequelize.query(`
      UPDATE "cards" c
      SET "coluna_id" = col.id
      FROM "columns" col
      WHERE c."coluna_id" IS NULL
      AND lower(coalesce(c."status", c."coluna", '')) = lower(col."nome");
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("columns", "columns_nome_unique").catch(() => {});
    await queryInterface.removeColumn("cards", "coluna_id").catch(() => {});
  },
};