const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// 🔹 Model do fluxo "Carta de Ativação" (Depto. Delivery)
const Ativacao = sequelize.define(
  "Ativacao",
  {
    // Dados de criação (preenchidos pela equipe interna)
    cliente: { type: DataTypes.STRING(255), allowNull: false },
    cnpj: { type: DataTypes.STRING(32), allowNull: false },
    circuito: { type: DataTypes.STRING(120), allowNull: false },
    id_cliente_nvx: { type: DataTypes.STRING(120), allowNull: false },
    endereco: { type: DataTypes.TEXT, allowNull: false },
    cidade: { type: DataTypes.STRING(120), allowNull: true },
    estado: { type: DataTypes.STRING(2), allowNull: true },
    contato_cliente: { type: DataTypes.STRING(255), allowNull: true },
    email_cliente: { type: DataTypes.STRING(255), allowNull: false },
    tipo_servico: {
      type: DataTypes.ENUM("DIA", "BIA", "SDIA", "L2L"),
      allowNull: false,
    },
    velocidade_contratada: { type: DataTypes.STRING(60), allowNull: false },
    gerente_conta: { type: DataTypes.STRING(120), allowNull: false },

    tecnico_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "technicians", key: "id" },
      onDelete: "SET NULL",
    },

    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },

    // Card do Kanban vinculado a esta ativação (opcional) — quando definido, a
    // Carta de Ativação finalizada é anexada automaticamente a ele.
    card_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "cards", key: "id" },
      onDelete: "SET NULL",
    },

    // Controle de acesso e status
    public_token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    status: {
      type: DataTypes.ENUM(
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
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "id" },
      onDelete: "SET NULL",
    },

    // Dados técnicos (preenchidos pelo técnico via link público)
    ip_publico: { type: DataTypes.STRING(60), allowNull: true },
    gateway: { type: DataTypes.STRING(60), allowNull: true },
    mascara: { type: DataTypes.STRING(60), allowNull: true },
    dns: { type: DataTypes.STRING(120), allowNull: true },
    ipv6: { type: DataTypes.STRING(120), allowNull: true },
    vlan: { type: DataTypes.STRING(60), allowNull: true },
    latencia: { type: DataTypes.STRING(30), allowNull: true },
    perda_pacotes: { type: DataTypes.STRING(30), allowNull: true },

    // Evidências e testes
    evidencias: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    teste_velocidade: { type: DataTypes.JSONB, allowNull: true },
    resultado_conectividade: { type: DataTypes.TEXT, allowNull: true },
    observacoes: { type: DataTypes.TEXT, allowNull: true },
    // Imagens/vídeos livres anexados às observações — { id, name, type, data(base64 dataURL) }[]
    observacoes_anexos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    motivo_rejeicao: { type: DataTypes.TEXT, allowNull: true },

    // Carta de Ativação gerada
    data_ativacao: { type: DataTypes.DATE, allowNull: true },
    carta_pdf_base64: { type: DataTypes.TEXT, allowNull: true },
    carta_gerada_em: { type: DataTypes.DATE, allowNull: true },
    finalizada_em: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "ativacoes",
    timestamps: true,
  }
);

module.exports = Ativacao;
