"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove a constraint antiga (nome pode variar, ajuste se necessário)
    await queryInterface.removeConstraint("notifications", "notifications_card_id_fkey");

    // Adiciona novamente com ON DELETE SET NULL
    await queryInterface.addConstraint("notifications", {
      fields: ["card_id"],
      type: "foreign key",
      name: "notifications_card_id_fkey",
      references: {
        table: "cards",
        field: "id"
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove a constraint com SET NULL
    await queryInterface.removeConstraint("notifications", "notifications_card_id_fkey");

    // Adiciona novamente sem ON DELETE SET NULL (ajuste conforme o original se necessário)
    await queryInterface.addConstraint("notifications", {
      fields: ["card_id"],
      type: "foreign key",
      name: "notifications_card_id_fkey",
      references: {
        table: "cards",
        field: "id"
      },
      onDelete: "NO ACTION",
      onUpdate: "CASCADE"
    });
  }
};
