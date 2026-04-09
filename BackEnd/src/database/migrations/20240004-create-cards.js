"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("cards", {
      id:                 { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      cliente:            { type: Sequelize.STRING },
      telefone:           { type: Sequelize.STRING },
      endereco:           { type: Sequelize.STRING },
      coordenadas:        { type: Sequelize.JSONB },           // { lat, lng }
      titulo:             { type: Sequelize.STRING },
      tipoServico:        { type: Sequelize.STRING },
      preco:              { type: Sequelize.DECIMAL(10, 2) },
      comments:           { type: Sequelize.JSONB, defaultValue: [] }, // [{ text, author, createdAt }]
      ip:                 { type: Sequelize.STRING },
      sla:                { type: Sequelize.INTEGER },
      prazo:              { type: Sequelize.DATE },
      status:             { type: Sequelize.STRING, defaultValue: "Novo" },
      coluna:             { type: Sequelize.STRING },
      observacoes:        { type: Sequelize.TEXT },
      vendedor_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
        allowNull: true
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("cards");
  }
};