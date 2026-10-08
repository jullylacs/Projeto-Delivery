"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable("users");
    if (tableDesc.acesso_kanban_externo) return; // idempotente

    await queryInterface.addColumn("users", "acesso_kanban_externo", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Backfill: admin e gestor recebem acesso ao Externo por padrão.
    await queryInterface.sequelize.query(`
      UPDATE "users"
      SET "acesso_kanban_externo" = TRUE
      WHERE "perfil" IN ('admin', 'gestor');
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "acesso_kanban_externo");
  },
};
