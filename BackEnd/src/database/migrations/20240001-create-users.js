"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id:          { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome:        { type: Sequelize.STRING, allowNull: false },
      email:       { type: Sequelize.STRING, allowNull: false, unique: true },
      senha:       { type: Sequelize.STRING, allowNull: false },
      perfil:      { type: Sequelize.ENUM("comercial","operacional","tecnico","gestor","admin"), defaultValue: "comercial" },
      telefone:    { type: Sequelize.STRING },
      departamento:{ type: Sequelize.STRING },
      avatar:      { type: Sequelize.TEXT },
      createdAt:   { type: Sequelize.DATE, allowNull: false },
      updatedAt:   { type: Sequelize.DATE, allowNull: false }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("users");
  }
};