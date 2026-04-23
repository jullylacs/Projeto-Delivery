"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.createTable("cards", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      cliente: { type: Sequelize.STRING },
      telefone: { type: Sequelize.STRING },
      endereco: { type: Sequelize.STRING },
      coordenadas: { type: Sequelize.JSONB },
      titulo: { type: Sequelize.STRING },
      tipoServico: { type: Sequelize.STRING },

      // posição 9 (8 não existe no dump — normal)
      comments: { type: Sequelize.JSONB, defaultValue: [] },

      ip: { type: Sequelize.STRING },
      sla: { type: Sequelize.INTEGER },
      prazo: { type: Sequelize.DATE },

      // 13 e 14 não existem (dropados historicamente)
      observacoes: { type: Sequelize.TEXT },

      vendedor_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },

      coluna_id: {
        type: Sequelize.INTEGER,
        references: { model: "columns", key: "id" },
        onDelete: "SET NULL",
      },

      preco: { type: Sequelize.DECIMAL },
      instalacao: { type: Sequelize.DECIMAL },
      tempo_contratual_meses: { type: Sequelize.INTEGER },
      
      sla_valores: { type: Sequelize.JSONB },
      
      tipo_card: {
        type: Sequelize.ENUM(
          "Venda",
          "Cotação",
          "POC",
          "Projeto",
          "Suporte"
        ),
        allowNull: true,
        defaultValue: "Venda",
      },
      
      tempoContratual: { type: Sequelize.INTEGER },
      
      slaDetalhado: { type: Sequelize.JSONB },
      mensalidade: { type: Sequelize.DECIMAL },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("cards");
  },
};