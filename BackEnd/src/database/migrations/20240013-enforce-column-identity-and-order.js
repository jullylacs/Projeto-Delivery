"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove índice legado (case-sensitive) se existir.
    await queryInterface.removeIndex("columns", "columns_nome_unique").catch(() => {});

    // Normaliza nomes com trim para evitar duplicatas por espaços.
    await queryInterface.sequelize.query(`
      UPDATE "columns"
      SET "nome" = btrim("nome")
      WHERE "nome" IS NOT NULL;
    `);

    // Mapeia cards antigos para coluna_id por nome.
    await queryInterface.sequelize.query(`
      UPDATE "cards" c
      SET "coluna_id" = col.id
      FROM "columns" col
      WHERE c."coluna_id" IS NULL
        AND lower(btrim(coalesce(c."status", c."coluna", ''))) = lower(btrim(col."nome"));
    `);

    // Reaponta cards de colunas duplicadas para uma coluna canônica.
    await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT
          id,
          row_number() OVER (PARTITION BY lower(btrim("nome")) ORDER BY "ordem" ASC, id ASC) AS rn,
          first_value(id) OVER (PARTITION BY lower(btrim("nome")) ORDER BY "ordem" ASC, id ASC) AS keep_id
        FROM "columns"
      ),
      dupes AS (
        SELECT id, keep_id
        FROM ranked
        WHERE rn > 1
      )
      UPDATE "cards" c
      SET "coluna_id" = d.keep_id
      FROM dupes d
      WHERE c."coluna_id" = d.id;
    `);

    // Remove linhas duplicadas de colunas.
    await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT
          id,
          row_number() OVER (PARTITION BY lower(btrim("nome")) ORDER BY "ordem" ASC, id ASC) AS rn
        FROM "columns"
      )
      DELETE FROM "columns" c
      USING ranked r
      WHERE c.id = r.id
        AND r.rn > 1;
    `);

    // Sincroniza status/coluna text com a coluna vinculada por FK.
    await queryInterface.sequelize.query(`
      UPDATE "cards" c
      SET "status" = col."nome",
          "coluna" = col."nome"
      FROM "columns" col
      WHERE c."coluna_id" = col.id;
    `);

    // Índice único case-insensitive para bloquear nomes duplicados.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS columns_nome_unique_ci
      ON "columns" (lower(btrim("nome")));
    `);

    // Reordena colunas de forma contígua (0..N-1).
    await queryInterface.sequelize.query(`
      WITH ordered AS (
        SELECT id, row_number() OVER (ORDER BY "ordem" ASC, id ASC) - 1 AS new_ordem
        FROM "columns"
      )
      UPDATE "columns" c
      SET "ordem" = o.new_ordem
      FROM ordered o
      WHERE c.id = o.id;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS columns_nome_unique_ci;`).catch(() => {});
    await queryInterface.addIndex("columns", ["nome"], {
      name: "columns_nome_unique",
      unique: true,
    }).catch(() => {});
  },
};
