"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mural_posts", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      autor: { type: Sequelize.STRING, allowNull: false },
      conteudo: { type: Sequelize.TEXT, allowNull: false },
      data: { type: Sequelize.DATEONLY, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("mural_posts");
  },
};
