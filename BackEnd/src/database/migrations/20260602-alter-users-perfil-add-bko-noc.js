"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_perfil" ADD VALUE IF NOT EXISTS 'bko';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_perfil" ADD VALUE IF NOT EXISTS 'noc';
    `);
  },

  async down() {
    // Não é possível remover valores de ENUM no PostgreSQL sem recriar o tipo.
  },
};
