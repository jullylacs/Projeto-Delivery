"use strict";

module.exports = {
  async up() {
    // No-op: a tabela notifications já existe neste ambiente com migrações anteriores.
    // Esta migração apenas mantém a sequência de versões consistente no SequelizeMeta.
  },

  async down() {
    // No-op intencional.
  },
};
