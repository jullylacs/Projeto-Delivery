const { Ativacao, Technician, User, Card } = require("../models");
const { gerarPublicToken } = require("../utils/ativacaoToken");
const { gerarCartaAtivacaoPdf } = require("../utils/pdfCartaAtivacao");
const { enviarCartaPorEmail } = require("../utils/emailAtivacao");
const { anexarDocumentoSistema } = require("./cardController");

const PERFIS_CRIACAO = new Set(["comercial", "gestor", "admin"]);
const PERFIS_APROVACAO = new Set(["operacional", "gestor", "admin"]);

const EVIDENCIAS_OBRIGATORIAS = [
  { tipo: "caixa_atendimento", label: "Foto da caixa de atendimento" },
  { tipo: "equipamento", label: "Foto do equipamento instalado" },
  { tipo: "identificacao_circuito", label: "Foto da identificação do circuito" },
  { tipo: "teste_conectividade", label: "Foto do teste de conectividade" },
];

const CAMPOS_TECNICOS_OBRIGATORIOS = [
  ["ip_publico", "IP público"],
  ["gateway", "Gateway"],
  ["mascara", "Máscara"],
  ["dns", "DNS"],
  ["vlan", "VLAN"],
  ["latencia", "Latência"],
  ["perda_pacotes", "Perda de pacotes"],
];

const INCLUDE_RELACOES = [
  { model: Technician, as: "tecnico" },
  { model: User, as: "criador", attributes: ["id", "nome", "email"] },
  { model: User, as: "aprovador", attributes: ["id", "nome", "email"] },
  { model: Card, as: "card", attributes: ["id", "titulo", "cliente"] },
];

// Revalida o perfil no banco — não confia no payload do token.
async function fetchPerfil(req) {
  if (!req.userId) return null;
  return User.findByPk(req.userId, { attributes: ["id", "nome", "perfil", "aprovado"] });
}

function toNullableInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// 🔹 Cria uma nova ativação e gera o link público para o técnico.
exports.create = async (req, res) => {
  try {
    const user = await fetchPerfil(req);
    if (!user) return res.status(401).json({ message: "Não autenticado" });
    if (!PERFIS_CRIACAO.has(user.perfil)) {
      return res.status(403).json({ message: "Sem permissão para criar ativações." });
    }

    const body = req.body || {};
    const obrigatorios = [
      "cliente",
      "cnpj",
      "circuito",
      "id_cliente_nvx",
      "endereco",
      "email_cliente",
      "tipo_servico",
      "velocidade_contratada",
      "gerente_conta",
    ];
    const faltando = obrigatorios.filter((campo) => !body[campo] || !String(body[campo]).trim());
    if (faltando.length) {
      return res.status(400).json({ message: `Campos obrigatórios ausentes: ${faltando.join(", ")}` });
    }

    if (!["DIA", "BIA", "SDIA", "L2L"].includes(body.tipo_servico)) {
      return res.status(400).json({ message: "tipo_servico inválido. Use DIA, BIA, SDIA ou L2L." });
    }

    const ativacao = await Ativacao.create({
      cliente: String(body.cliente).trim(),
      cnpj: String(body.cnpj).trim(),
      circuito: String(body.circuito).trim(),
      id_cliente_nvx: String(body.id_cliente_nvx).trim(),
      endereco: String(body.endereco).trim(),
      cidade: body.cidade ? String(body.cidade).trim() : null,
      estado: body.estado ? String(body.estado).trim().slice(0, 2).toUpperCase() : null,
      contato_cliente: body.contato_cliente ? String(body.contato_cliente).trim() : null,
      email_cliente: String(body.email_cliente).trim(),
      tipo_servico: body.tipo_servico,
      velocidade_contratada: String(body.velocidade_contratada).trim(),
      gerente_conta: String(body.gerente_conta).trim(),
      tecnico_id: toNullableInt(body.tecnico_id),
      card_id: toNullableInt(body.card_id),
      criado_por: req.userId,
      public_token: gerarPublicToken(),
      status: "aberta",
    });

    const criada = await Ativacao.findByPk(ativacao.id, { include: INCLUDE_RELACOES });
    return res.status(201).json(criada);
  } catch (err) {
    return res.status(500).json({ message: "Erro ao criar ativação", error: err.message });
  }
};

// 🔹 Lista ativações (uso interno), com filtro opcional por status.
exports.getAll = async (req, res) => {
  try {
    const user = await fetchPerfil(req);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    const where = {};
    if (req.query.status) where.status = req.query.status;

    const ativacoes = await Ativacao.findAll({
      where,
      include: INCLUDE_RELACOES,
      order: [["createdAt", "DESC"]],
    });
    return res.json(ativacoes);
  } catch (err) {
    return res.status(500).json({ message: "Erro ao listar ativações", error: err.message });
  }
};

// 🔹 Busca uma ativação por id (uso interno).
exports.getById = async (req, res) => {
  try {
    const user = await fetchPerfil(req);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    const ativacao = await Ativacao.findByPk(req.params.id, { include: INCLUDE_RELACOES });
    if (!ativacao) return res.status(404).json({ message: "Ativação não encontrada" });
    return res.json(ativacao);
  } catch (err) {
    return res.status(500).json({ message: "Erro ao buscar ativação", error: err.message });
  }
};

// 🔹 Atualiza os dados de criação de uma ativação (equipe interna).
exports.update = async (req, res) => {
  try {
    const user = await fetchPerfil(req);
    if (!user) return res.status(401).json({ message: "Não autenticado" });
    if (!PERFIS_CRIACAO.has(user.perfil)) {
      return res.status(403).json({ message: "Sem permissão para editar ativações." });
    }

    const ativacao = await Ativacao.findByPk(req.params.id);
    if (!ativacao) return res.status(404).json({ message: "Ativação não encontrada" });
    if (ativacao.status === "finalizada") {
      return res.status(409).json({ message: "Ativação já finalizada, não pode ser editada." });
    }

    const body = req.body || {};
    const patch = {};
    const campos = [
      "cliente",
      "cnpj",
      "circuito",
      "id_cliente_nvx",
      "endereco",
      "cidade",
      "estado",
      "contato_cliente",
      "email_cliente",
      "tipo_servico",
      "velocidade_contratada",
      "gerente_conta",
    ];
    campos.forEach((campo) => {
      if (body[campo] !== undefined) patch[campo] = typeof body[campo] === "string" ? body[campo].trim() : body[campo];
    });
    if (body.tecnico_id !== undefined) patch.tecnico_id = toNullableInt(body.tecnico_id);
    if (body.card_id !== undefined) patch.card_id = toNullableInt(body.card_id);

    await ativacao.update(patch);
    const atualizada = await Ativacao.findByPk(ativacao.id, { include: INCLUDE_RELACOES });
    return res.json(atualizada);
  } catch (err) {
    return res.status(500).json({ message: "Erro ao atualizar ativação", error: err.message });
  }
};

// 🔹 Remove uma ativação (restrito a gestor/admin via middleware requireManagerOrAdmin).
exports.remove = async (req, res) => {
  try {
    const deleted = await Ativacao.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Ativação não encontrada" });
    return res.json({ message: "Ativação removida" });
  } catch (err) {
    return res.status(500).json({ message: "Erro ao remover ativação", error: err.message });
  }
};

// 🔹 Aprova a ativação, gera a Carta de Ativação em PDF e tenta enviar por e-mail.
exports.aprovar = async (req, res) => {
  try {
    const user = await fetchPerfil(req);
    if (!user) return res.status(401).json({ message: "Não autenticado" });
    if (!PERFIS_APROVACAO.has(user.perfil)) {
      return res.status(403).json({ message: "Sem permissão para aprovar ativações." });
    }

    const ativacao = await Ativacao.findByPk(req.params.id, { include: INCLUDE_RELACOES });
    if (!ativacao) return res.status(404).json({ message: "Ativação não encontrada" });
    if (ativacao.status !== "aguardando_validacao") {
      return res.status(409).json({ message: "Ativação não está aguardando validação." });
    }

    await ativacao.update({
      status: "aprovada",
      aprovado_por: req.userId,
      data_ativacao: new Date(),
      motivo_rejeicao: null,
    });

    const pdfBuffer = await gerarCartaAtivacaoPdf(ativacao);
    await ativacao.update({
      status: "carta_gerada",
      carta_pdf_base64: pdfBuffer.toString("base64"),
      carta_gerada_em: new Date(),
    });

    const envio = await enviarCartaPorEmail(ativacao, pdfBuffer);

    await ativacao.update({ status: "finalizada", finalizada_em: new Date() });

    // Anexa a carta finalizada diretamente no card vinculado (se houver).
    // Falha aqui não deve derrubar a aprovação — a carta já foi gerada e enviada.
    let anexoNoCard = false;
    if (ativacao.card_id) {
      try {
        await anexarDocumentoSistema(
          ativacao.card_id,
          {
            name: `Carta de Ativacao - ${ativacao.circuito || ativacao.id}.pdf`,
            type: "application/pdf",
            data: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`,
          },
          `📄 Carta de Ativação finalizada e anexada automaticamente (circuito ${ativacao.circuito || "-"}).`
        );
        anexoNoCard = true;
      } catch (err) {
        console.error("[ativacaoController.aprovar] Falha ao anexar carta ao card:", err);
      }
    }

    const final = await Ativacao.findByPk(ativacao.id, { include: INCLUDE_RELACOES });
    return res.json({ ativacao: final, emailEnviado: envio.sent, emailErro: envio.error || null, anexoNoCard });
  } catch (err) {
    return res.status(500).json({ message: "Erro ao aprovar ativação", error: err.message });
  }
};

// 🔹 Rejeita a ativação, retornando para correção do técnico.
exports.rejeitar = async (req, res) => {
  try {
    const user = await fetchPerfil(req);
    if (!user) return res.status(401).json({ message: "Não autenticado" });
    if (!PERFIS_APROVACAO.has(user.perfil)) {
      return res.status(403).json({ message: "Sem permissão para rejeitar ativações." });
    }

    const { motivo } = req.body || {};
    if (!motivo || !String(motivo).trim()) {
      return res.status(400).json({ message: "Campo 'motivo' é obrigatório para rejeitar." });
    }

    const ativacao = await Ativacao.findByPk(req.params.id);
    if (!ativacao) return res.status(404).json({ message: "Ativação não encontrada" });
    if (ativacao.status !== "aguardando_validacao") {
      return res.status(409).json({ message: "Ativação não está aguardando validação." });
    }

    await ativacao.update({ status: "rejeitada", motivo_rejeicao: String(motivo).trim() });
    const atualizada = await Ativacao.findByPk(ativacao.id, { include: INCLUDE_RELACOES });
    return res.json(atualizada);
  } catch (err) {
    return res.status(500).json({ message: "Erro ao rejeitar ativação", error: err.message });
  }
};

// 🔹 Baixa o PDF da Carta de Ativação já gerada.
exports.baixarCarta = async (req, res) => {
  try {
    const ativacao = await Ativacao.findByPk(req.params.id);
    if (!ativacao) return res.status(404).json({ message: "Ativação não encontrada" });
    if (!ativacao.carta_pdf_base64) {
      return res.status(404).json({ message: "Carta ainda não foi gerada para esta ativação." });
    }

    const buffer = Buffer.from(ativacao.carta_pdf_base64, "base64");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="carta-ativacao-${ativacao.id}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ message: "Erro ao baixar carta", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Endpoints públicos (sem auth) — acessados pelo técnico via link único.
// IMPORTANTE: nunca responder 401 aqui — o interceptor global do frontend
// trata 401 como sessão expirada e força logout/redirect, o que não se
// aplica a esta página (o técnico nunca tem sessão).
// ─────────────────────────────────────────────────────────────────────────

const CAMPOS_PUBLICOS = [
  "cliente",
  "circuito",
  "endereco",
  "cidade",
  "estado",
  "tipo_servico",
  "velocidade_contratada",
  "status",
  "ip_publico",
  "gateway",
  "mascara",
  "dns",
  "ipv6",
  "vlan",
  "latencia",
  "perda_pacotes",
  "evidencias",
  "teste_velocidade",
  "resultado_conectividade",
  "observacoes",
  "observacoes_anexos",
  "motivo_rejeicao",
];

function serializePublic(ativacao) {
  const data = {};
  CAMPOS_PUBLICOS.forEach((campo) => {
    data[campo] = ativacao[campo];
  });
  return data;
}

// 🔹 Busca a ativação pelo token público (dados limitados ao necessário para o técnico).
exports.getPublic = async (req, res) => {
  try {
    const ativacao = await Ativacao.findOne({ where: { public_token: req.params.token } });
    if (!ativacao) return res.status(404).json({ message: "Link inválido ou expirado." });
    return res.json(serializePublic(ativacao));
  } catch (err) {
    console.error("[ativacaoController.getPublic]", err);
    return res.status(500).json({ message: "Erro ao carregar ativação", error: err.message });
  }
};

const CAMPOS_EDITAVEIS_TECNICO = [
  "ip_publico",
  "gateway",
  "mascara",
  "dns",
  "ipv6",
  "vlan",
  "latencia",
  "perda_pacotes",
  "evidencias",
  "teste_velocidade",
  "resultado_conectividade",
  "observacoes",
  "observacoes_anexos",
];

// 🔹 Salva o progresso do técnico (dados técnicos, evidências, testes, observações).
exports.updatePublic = async (req, res) => {
  try {
    const ativacao = await Ativacao.findOne({ where: { public_token: req.params.token } });
    if (!ativacao) return res.status(404).json({ message: "Link inválido ou expirado." });

    if (!["aberta", "em_execucao", "rejeitada"].includes(ativacao.status)) {
      return res.status(409).json({ message: "Esta ativação não pode mais ser editada." });
    }

    const body = req.body || {};
    const patch = {};
    CAMPOS_EDITAVEIS_TECNICO.forEach((campo) => {
      if (body[campo] !== undefined) patch[campo] = body[campo];
    });

    if (ativacao.status === "aberta") patch.status = "em_execucao";

    await ativacao.update(patch);
    return res.json(serializePublic(ativacao));
  } catch (err) {
    console.error("[ativacaoController.updatePublic]", err);
    return res.status(500).json({ message: "Erro ao salvar dados", error: err.message });
  }
};

// 🔹 Marca "Instalação Concluída" — valida obrigatórios e avança para Aguardando Validação NVX.
exports.concluirPublic = async (req, res) => {
  try {
    const ativacao = await Ativacao.findOne({ where: { public_token: req.params.token } });
    if (!ativacao) return res.status(404).json({ message: "Link inválido ou expirado." });

    if (!["aberta", "em_execucao", "rejeitada"].includes(ativacao.status)) {
      return res.status(409).json({ message: "Esta ativação não pode ser concluída no estado atual." });
    }

    const faltando = [];

    CAMPOS_TECNICOS_OBRIGATORIOS.forEach(([campo, label]) => {
      if (!ativacao[campo] || !String(ativacao[campo]).trim()) faltando.push(label);
    });

    const evidencias = Array.isArray(ativacao.evidencias) ? ativacao.evidencias : [];
    const tiposPresentes = new Set(evidencias.map((e) => e?.tipo));
    EVIDENCIAS_OBRIGATORIAS.forEach(({ tipo, label }) => {
      if (!tiposPresentes.has(tipo)) faltando.push(label);
    });

    if (!ativacao.teste_velocidade) faltando.push("Teste de velocidade");
    if (!ativacao.resultado_conectividade || !String(ativacao.resultado_conectividade).trim()) {
      faltando.push("Resultado do teste de conectividade");
    }

    if (faltando.length) {
      return res.status(400).json({ message: "Campos obrigatórios pendentes.", faltando });
    }

    await ativacao.update({ status: "aguardando_validacao", motivo_rejeicao: null });
    return res.json(serializePublic(ativacao));
  } catch (err) {
    console.error("[ativacaoController.concluirPublic]", err);
    return res.status(500).json({ message: "Erro ao concluir instalação", error: err.message });
  }
};
