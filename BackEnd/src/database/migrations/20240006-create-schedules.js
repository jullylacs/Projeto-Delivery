"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable("schedules", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

      data: { type: Sequelize.DATE },
      horario: { type: Sequelize.STRING },
      janela: { type: Sequelize.STRING },

      status: {
        type: Sequelize.ENUM("pendente", "confirmado", "reagendado", "em_execucao", "finalizado"),
        defaultValue: "pendente",
      },

      motivoReagendamento: { type: Sequelize.TEXT },

      card_id: {
        type: Sequelize.INTEGER,
        references: { model: "cards", key: "id" },
      },

      tecnico_id: {
        type: Sequelize.INTEGER,
        references: { model: "technicians", key: "id" },
      },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },

      titulo: { type: Sequelize.STRING },
      notas: { type: Sequelize.TEXT },

      usuario_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("schedules");
  },
};