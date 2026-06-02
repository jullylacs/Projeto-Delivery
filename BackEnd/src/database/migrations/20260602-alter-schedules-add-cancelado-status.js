"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_schedules_status" ADD VALUE IF NOT EXISTS 'cancelado';
    `);
  },

  async down() {
    // Não é possível remover valores de ENUM no PostgreSQL sem recriar o tipo.
  },
};
