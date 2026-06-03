"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "acesso_kanban_bko", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Backfill: admin e gestor recebem acesso ao BKO por padrão.
    await queryInterface.sequelize.query(`
      UPDATE "users"
      SET "acesso_kanban_bko" = TRUE
      WHERE "perfil" IN ('admin', 'gestor');
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "acesso_kanban_bko");
  },
};
