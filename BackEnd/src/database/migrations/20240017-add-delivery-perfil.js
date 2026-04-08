"use strict";

module.exports = {
  async up(queryInterface) {
    // Adiciona 'delivery' ao enum somente se ainda não existir
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_users_perfil'
            AND e.enumlabel = 'delivery'
        ) THEN
          ALTER TYPE "enum_users_perfil" ADD VALUE 'delivery';
        END IF;
      END$$;
    `);
  },

  async down() {
    // Remoção de valor de ENUM no PostgreSQL requer recriação do tipo —
    // operação destrutiva omitida intencionalmente.
  },
};
