"use strict";

// Migration: cria a tabela de agendamentos de instalações
module.exports = {
  // Executa a criação da tabela ao rodar `sequelize db:migrate`
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("schedules", {
      id:                  { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      data:                { type: Sequelize.DATE },                    // data da instalação
      horario:             { type: Sequelize.STRING },                  // horário exato (ex: "08:00")
      janela:              { type: Sequelize.STRING },                  // janela de atendimento (ex: "08h–12h")
      status:              { type: Sequelize.ENUM("pendente","confirmado","reagendado","em_execucao","finalizado"), defaultValue: "pendente" },
      motivoReagendamento: { type: Sequelize.TEXT },                    // preenchido quando status = reagendado
      card_id: {
        type: Sequelize.INTEGER,
        references: { model: "cards", key: "id" },
        onDelete: "CASCADE", // ao excluir o card, remove o agendamento
        allowNull: false
      },
      tecnico_id: {
        type: Sequelize.INTEGER,
        references: { model: "technicians", key: "id" },
        onDelete: "SET NULL", // ao excluir o técnico, mantém o agendamento sem técnico
        allowNull: true
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  // Desfaz a migration ao rodar `sequelize db:migrate:undo`
  async down(queryInterface) {
    await queryInterface.dropTable("schedules");
  }
};