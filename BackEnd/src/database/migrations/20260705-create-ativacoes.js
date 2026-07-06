"use strict";

// Cria a tabela `ativacoes`, usada pelo fluxo "Carta de Ativação" do Depto. Delivery.
// A equipe interna cria a ativação (dados de cliente/circuito), o técnico preenche
// dados técnicos e evidências via link público (public_token), e a Operações
// aprova/rejeita. Na aprovação o sistema gera e envia a carta automaticamente.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ativacoes", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },

      // ── Dados preenchidos pela equipe interna na criação ──────────────
      cliente: { type: Sequelize.STRING(255), allowNull: false },
      cnpj: { type: Sequelize.STRING(32), allowNull: false },
      circuito: { type: Sequelize.STRING(120), allowNull: false },
      id_cliente_nvx: { type: Sequelize.STRING(120), allowNull: false },
      endereco: { type: Sequelize.TEXT, allowNull: false },
      cidade: { type: Sequelize.STRING(120), allowNull: true },
      estado: { type: Sequelize.STRING(2), allowNull: true },
      contato_cliente: { type: Sequelize.STRING(255), allowNull: true },
      email_cliente: { type: Sequelize.STRING(255), allowNull: false },
      tipo_servico: {
        type: Sequelize.ENUM("DIA", "BIA", "SDIA", "L2L"),
        allowNull: false,
      },
      velocidade_contratada: { type: Sequelize.STRING(60), allowNull: false },
      gerente_conta: { type: Sequelize.STRING(120), allowNull: false },

      tecnico_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "technicians", key: "id" },
        onDelete: "SET NULL",
      },

      criado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },

      // ── Controle de acesso e status do fluxo ───────────────────────────
      public_token: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      status: {
        type: Sequelize.ENUM(
          "aberta",
          "em_execucao",
          "aguardando_validacao",
          "rejeitada",
          "aprovada",
          "carta_gerada",
          "finalizada"
        ),
        allowNull: false,
        defaultValue: "aberta",
      },

      aprovado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },

      // ── Dados técnicos preenchidos pelo técnico ────────────────────────
      ip_publico: { type: Sequelize.STRING(60), allowNull: true },
      gateway: { type: Sequelize.STRING(60), allowNull: true },
      mascara: { type: Sequelize.STRING(60), allowNull: true },
      dns: { type: Sequelize.STRING(120), allowNull: true },
      ipv6: { type: Sequelize.STRING(120), allowNull: true },
      vlan: { type: Sequelize.STRING(60), allowNull: true },
      latencia: { type: Sequelize.STRING(30), allowNull: true },
      perda_pacotes: { type: Sequelize.STRING(30), allowNull: true },

      // ── Evidências e testes ─────────────────────────────────────────────
      evidencias: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      teste_velocidade: { type: Sequelize.JSONB, allowNull: true },
      resultado_conectividade: { type: Sequelize.TEXT, allowNull: true },
      observacoes: { type: Sequelize.TEXT, allowNull: true },
      motivo_rejeicao: { type: Sequelize.TEXT, allowNull: true },

      // ── Carta de Ativação gerada ────────────────────────────────────────
      data_ativacao: { type: Sequelize.DATE, allowNull: true },
      carta_pdf_base64: { type: Sequelize.TEXT, allowNull: true },
      carta_gerada_em: { type: Sequelize.DATE, allowNull: true },
      finalizada_em: { type: Sequelize.DATE, allowNull: true },

      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("ativacoes", ["status"], {
      name: "ativacoes_status_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("ativacoes");
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_ativacoes_tipo_servico";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_ativacoes_status";`);
  },
};
