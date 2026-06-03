"use strict";

module.exports = {
  async up(queryInterface) {
    // 1) Consolida duplicatas existentes: para cada (usuario_id, sourceKey),
    //    mantém o MENOR id e propaga lida/limpa de qualquer duplicata para
    //    o registro vencedor (basta uma marca para o conjunto ser considerado
    //    lido/limpo). Depois apaga as demais.
    await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT id,
               usuario_id,
               metadata->>'sourceKey' AS source_key,
               lida,
               "lidaEm",
               limpa,
               "limpaEm",
               ROW_NUMBER() OVER (
                 PARTITION BY usuario_id, metadata->>'sourceKey'
                 ORDER BY id ASC
               ) AS rn
        FROM notifications
        WHERE metadata ? 'sourceKey'
      ),
      winners AS (
        SELECT r.usuario_id,
               r.source_key,
               MIN(r.id) AS winner_id,
               BOOL_OR(r.lida) AS any_lida,
               MAX(r."lidaEm") AS max_lida_em,
               BOOL_OR(r.limpa) AS any_limpa,
               MAX(r."limpaEm") AS max_limpa_em
        FROM ranked r
        GROUP BY r.usuario_id, r.source_key
      )
      UPDATE notifications n
         SET lida = w.any_lida,
             "lidaEm" = w.max_lida_em,
             limpa = w.any_limpa,
             "limpaEm" = w.max_limpa_em
        FROM winners w
       WHERE n.id = w.winner_id;
    `);

    await queryInterface.sequelize.query(`
      DELETE FROM notifications n
       USING (
         SELECT id,
                ROW_NUMBER() OVER (
                  PARTITION BY usuario_id, metadata->>'sourceKey'
                  ORDER BY id ASC
                ) AS rn
           FROM notifications
          WHERE metadata ? 'sourceKey'
       ) d
       WHERE n.id = d.id
         AND d.rn > 1;
    `);

    // 2) Índice único parcial em (usuario_id, metadata->>'sourceKey').
    //    Parcial porque notificações antigas/manuais podem não ter sourceKey
    //    no metadata; só dedupa as que têm.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_source_key
        ON notifications (usuario_id, ((metadata->>'sourceKey')))
        WHERE metadata ? 'sourceKey';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS notifications_unique_source_key;`
    );
  },
};
