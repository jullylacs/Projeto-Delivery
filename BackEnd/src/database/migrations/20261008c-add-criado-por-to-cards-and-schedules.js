"use strict";

// Dono do registro: quem criou o card / o agendamento. É o que o perfil
// "vendedor_externo" usa para enxergar só o que é dele. Registros antigos
// ficam com NULL de propósito — não têm dono, então o externo não os vê.
const TABELAS = ["cards", "schedules"];

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const tabela of TABELAS) {
      const tableDesc = await queryInterface.describeTable(tabela);
      if (tableDesc.criado_por) continue; // idempotente

      await queryInterface.addColumn(tabela, "criado_por", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      });
      await queryInterface.addIndex(tabela, ["criado_por"], { name: `${tabela}_criado_por_idx` });
    }
  },

  async down(queryInterface) {
    for (const tabela of TABELAS) {
      await queryInterface.removeIndex(tabela, `${tabela}_criado_por_idx`);
      await queryInterface.removeColumn(tabela, "criado_por");
    }
  },
};
