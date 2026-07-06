"use strict";

// Vincula uma Ativacao a um Card do Kanban (opcional) — permite anexar
// automaticamente a Carta de Ativação finalizada no card correspondente.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ativacoes", "card_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "cards", key: "id" },
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("ativacoes", "card_id");
  },
};
