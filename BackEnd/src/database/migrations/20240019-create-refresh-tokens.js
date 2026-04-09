"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.describeTable("refresh_tokens");
      return;
    } catch {
      // Tabela não existe, cria usando o schema legado já adotado no projeto.
    }

    await queryInterface.createTable("refresh_tokens", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      token: { type: Sequelize.TEXT, allowNull: false },
      expiraEm: { type: Sequelize.DATE, allowNull: false },
      revogadoEm: { type: Sequelize.DATE, allowNull: true },
      usuario_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("refresh_tokens", ["usuario_id"]);
    await queryInterface.addIndex("refresh_tokens", ["expiraEm"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("refresh_tokens");
  },
};
