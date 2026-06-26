"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable("users");
    if (tableDesc.acesso_kanban_compras) return; // idempotente

    await queryInterface.addColumn("users", "acesso_kanban_compras", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.sequelize.query(`
      UPDATE "users"
      SET "acesso_kanban_compras" = TRUE
      WHERE "perfil" IN ('admin', 'gestor');
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "acesso_kanban_compras");
  },
};
