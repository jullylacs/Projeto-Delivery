"use strict";

// Permite anexar imagens/vídeos livres às observações da ativação (além das
// evidências fotográficas obrigatórias por tipo).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ativacoes", "observacoes_anexos", {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("ativacoes", "observacoes_anexos");
  },
};
