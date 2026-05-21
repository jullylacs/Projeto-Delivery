"use strict";

// Cria a tabela `agenda_eventos`, utilizada pela feature "Agenda de Delivery".
// Eventos podem ser individuais (de um usuário) ou gerais (visíveis ao time de Delivery).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("agenda_eventos", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },

      titulo: { type: Sequelize.STRING(255), allowNull: false },

      // HTML sanitizado vindo de um editor rich text (ex.: TipTap).
      descricao_html: { type: Sequelize.TEXT, allowNull: true },

      inicio: { type: "TIMESTAMP WITH TIME ZONE", allowNull: false },
      fim: { type: "TIMESTAMP WITH TIME ZONE", allowNull: true },

      all_day: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      escopo: {
        type: Sequelize.ENUM("individual", "geral"),
        allowNull: false,
        defaultValue: "individual",
      },

      tipo: {
        type: Sequelize.ENUM("tarefa", "aviso", "programacao"),
        allowNull: false,
        defaultValue: "tarefa",
      },

      cor: { type: Sequelize.STRING(20), allowNull: true },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("agenda_eventos", ["usuario_id", "inicio"], {
      name: "agenda_eventos_usuario_inicio_idx",
    });

    await queryInterface.addIndex("agenda_eventos", ["escopo", "inicio"], {
      name: "agenda_eventos_escopo_inicio_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("agenda_eventos");
    // Os ENUMs criados pelo Sequelize precisam ser removidos manualmente em Postgres.
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_agenda_eventos_escopo";`
    );
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_agenda_eventos_tipo";`
    );
  },
};
