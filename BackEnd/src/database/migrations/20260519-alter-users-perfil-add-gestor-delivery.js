"use strict";

// Adiciona o valor "gestor_delivery" ao ENUM users.perfil.
// Postgres exige ALTER TYPE para incluir novos rótulos em um ENUM existente.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_users_perfil" ADD VALUE IF NOT EXISTS 'gestor_delivery';`
    );
  },

  async down() {
    // Postgres não suporta remover valor de ENUM de forma trivial.
    // Para reverter seria necessário criar um novo tipo, migrar dados e renomear.
    // Mantém como no-op para evitar perda de dados acidental.
    // eslint-disable-next-line no-console
    console.warn(
      "[migration down] Não é possível remover 'gestor_delivery' do ENUM users.perfil automaticamente. Operação ignorada."
    );
  },
};
