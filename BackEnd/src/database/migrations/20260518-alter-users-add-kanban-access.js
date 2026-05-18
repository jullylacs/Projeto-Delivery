"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "acesso_kanban_delivery", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn("users", "acesso_kanban_comercial", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Backfill com base no perfil para preservar o comportamento atual.
    // - admin/gestor: ambos os Kanbans.
    // - comercial: apenas Comercial.
    // - todos os outros perfis (operacional, tecnico, delivery, convidado): apenas Delivery.
    await queryInterface.sequelize.query(`
      UPDATE "users"
      SET "acesso_kanban_delivery" = TRUE,
          "acesso_kanban_comercial" = TRUE
      WHERE "perfil" IN ('admin', 'gestor');
    `);

    await queryInterface.sequelize.query(`
      UPDATE "users"
      SET "acesso_kanban_comercial" = TRUE
      WHERE "perfil" = 'comercial';
    `);

    await queryInterface.sequelize.query(`
      UPDATE "users"
      SET "acesso_kanban_delivery" = TRUE
      WHERE "perfil" NOT IN ('admin', 'gestor', 'comercial');
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "acesso_kanban_comercial");
    await queryInterface.removeColumn("users", "acesso_kanban_delivery");
  },
};
