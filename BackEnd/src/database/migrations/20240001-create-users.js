"use strict";

// Migration: cria a tabela de usuários do sistema
module.exports = {
  // Executa a criação da tabela ao rodar `sequelize db:migrate`
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id:          { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nome:        { type: Sequelize.STRING, allowNull: false },
      email:       { type: Sequelize.STRING, allowNull: false, unique: true },
      senha:       { type: Sequelize.STRING, allowNull: false }, // hash bcrypt
      perfil:      { type: Sequelize.ENUM("comercial","operacional","tecnico","gestor","admin"), defaultValue: "comercial" },
      telefone:    { type: Sequelize.STRING },
      departamento:{ type: Sequelize.STRING },
      avatar:      { type: Sequelize.TEXT }, // base64 ou URL
      createdAt:   { type: Sequelize.DATE, allowNull: false },
      updatedAt:   { type: Sequelize.DATE, allowNull: false }
    });
  },
  // Desfaz a migration ao rodar `sequelize db:migrate:undo`
  async down(queryInterface) {
    await queryInterface.dropTable("users");
  }
};