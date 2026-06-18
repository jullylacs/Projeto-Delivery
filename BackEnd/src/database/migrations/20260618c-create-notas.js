"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notas", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "users", key: "id" }, onDelete: "CASCADE" },
      titulo: { type: Sequelize.STRING(500), allowNull: true, defaultValue: "" },
      conteudo: { type: Sequelize.TEXT, allowNull: true, defaultValue: "" },
      cor: { type: Sequelize.STRING(20), allowNull: true, defaultValue: "default" },
      favorita: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("notas", ["usuario_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("notas");
  },
};
