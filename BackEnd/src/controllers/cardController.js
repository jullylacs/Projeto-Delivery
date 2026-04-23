const { Card, User, Column } = require("../models"); // Importa o model de Card (Sequelize/PostgreSQL)
const { fn, col, where } = require("sequelize");

const normalizeCard = (card) => {
  const raw = card?.toJSON ? card.toJSON() : { ...card };
  if (!raw) return raw;

  // Garante que tipo_card sempre exista (mesmo se vier null do banco)
  if (!raw.tipo_card) {
    raw.tipo_card = "Venda"; // Valor padrão se não vier do banco
  }

  const resolvedColumnId = Number(raw?.coluna_id ?? raw?.colunaId ?? raw?.column?.id);
  if (Number.isFinite(resolvedColumnId)) {
    raw.coluna_id = resolvedColumnId;
    raw.colunaId = resolvedColumnId;
  }

  const resolvedColumnName = String(raw?.column?.nome || "").trim();
  if (resolvedColumnName) {
    raw.status = resolvedColumnName;
    raw.coluna = resolvedColumnName;
  } else {
    raw.status = "Novo";
    raw.coluna = "Novo";
  }

  if (raw.id !== undefined && raw._id === undefined) {
    raw._id = String(raw.id);
  }

  return raw;
};

const findColumnByNameCI = async (name) => {
  return Column.findOne({
    where: where(fn("lower", col("nome")), String(name || "").trim().toLowerCase()),
  });
};

const ensureDefaultColumn = async () => {
  const existing = await findColumnByNameCI("Novo");
  if (existing) return existing;

  const maxOrder = (await Column.max("ordem")) ?? -1;
  return Column.create({ nome: "Novo", ordem: maxOrder + 1 });
};

const resolveColumn = async (payload) => {
  const explicitColumnId = payload?.coluna_id ?? payload?.colunaId ?? null;
  const columnName = payload?.status ?? payload?.coluna ?? null;

  if (explicitColumnId !== null && explicitColumnId !== undefined && String(explicitColumnId).trim() !== "") {
    const byId = await Column.findByPk(Number(explicitColumnId));
    if (!byId) return null;
    return byId;
  }

  if (columnName) {
    const byName = await findColumnByNameCI(columnName);
    if (!byName) return null;
    return byName;
  }

  const fallback = await ensureDefaultColumn();
  return fallback || null;
};

const buildCardPayload = async (input) => {
  const payload = { ...input };
  // Garante que tempoContratual seja inteiro ou null
  if (payload.tempoContratual !== undefined && payload.tempoContratual !== null && payload.tempoContratual !== "") {
    const parsedTempo = parseInt(payload.tempoContratual, 10);
    payload.tempoContratual = Number.isFinite(parsedTempo) ? parsedTempo : null;
  }
  const resolvedColumn = await resolveColumn(payload);

  if (!resolvedColumn) {
    return { error: "Coluna inválida. Crie a coluna antes de vincular cards." };
  }

  const vendorCandidate = payload?.vendedor_id ?? payload?.vendedorId ?? payload?.vendedor?.id ?? payload?.vendedor?._id;
  if (vendorCandidate !== undefined && vendorCandidate !== null && String(vendorCandidate).trim() !== "") {
    const parsedVendorId = Number(vendorCandidate);
    if (!Number.isFinite(parsedVendorId)) {
      return { error: "Vendedor inválido." };
    }

    const vendorExists = await User.findByPk(parsedVendorId);
    if (!vendorExists) {
      return { error: "Vendedor não encontrado." };
    }

    payload.vendedor_id = parsedVendorId;
  }

  payload.coluna_id = resolvedColumn.id;

  delete payload.colunaId;
  delete payload.status;
  delete payload.coluna;
  delete payload.vendedorId;
  delete payload.vendedor;

  return { payload };
};

// 🔹 Criação de um novo card
exports.createCard = async (req, res) => {
  try {
    const { payload, error } = await buildCardPayload(req.body || {});
    if (error) {
      return res.status(400).json({ error });
    }

    // Cria um novo card com os dados enviados no body da requisição
    const card = await Card.create(payload);

    const cardWithRelations = await Card.findByPk(card.id, {
      include: [
        { model: User, as: "vendedor", attributes: { exclude: ["senha"] } },
        { model: Column, as: "column" },
      ],
    });

    // Retorna o card criado como resposta
    res.json(normalizeCard(cardWithRelations));
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json({ error: err?.message || err?.name || "Erro ao criar card" });
  }
};

// 🔹 Listagem de todos os cards
exports.getCards = async (req, res) => {
  try {
    // Busca todos os cards no banco
    // include: [{ model: User }] substitui o populate("vendedor") do Mongoose —
    // traz os dados completos do usuário vinculado ao card
    const cards = await Card.findAll({
      include: [
        { model: User, as: "vendedor", attributes: { exclude: ["senha"] } },
        { model: Column, as: "column" },
      ],
      order: [["updatedAt", "DESC"], ["id", "DESC"]],
    });

    // Retorna a lista de cards
    res.json(cards.map(normalizeCard));
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json({ error: err?.message || err?.name || "Erro ao listar cards" });
  }
};

// 🔹 Atualização de um card existente
exports.updateCard = async (req, res) => {
  try {
    const targetId = req.params.id;

    const existing = await Card.findByPk(targetId);
    if (!existing) {
      return res.status(404).json({ error: "Card não encontrado" });
    }

    const mergedInput = { ...existing.toJSON(), ...(req.body || {}) };
    const { payload, error } = await buildCardPayload(mergedInput);
    if (error) {
      return res.status(400).json({ error });
    }

    // Atualiza o card com os dados do body filtrando pelo ID
    // Equivalente ao findByIdAndUpdate do Mongoose
    await Card.update(payload, { where: { id: targetId } });

    // Busca o card já atualizado para retornar ao cliente
    // Equivalente ao { new: true } do Mongoose — que retornava o documento atualizado
    const card = await Card.findByPk(targetId, {
      include: [
        { model: User, as: "vendedor", attributes: { exclude: ["senha"] } },
        { model: Column, as: "column" },
      ],
    });

    // Retorna o card atualizado
    res.json(normalizeCard(card));
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json({ error: err?.message || err?.name || "Erro ao atualizar card" });
  }
};

// 🔹 Exclusão de um card
exports.deleteCard = async (req, res) => {
  try {
    const targetId = req.params.id;

    // Remove o card do banco pelo ID informado
    // Equivalente ao findByIdAndDelete do Mongoose
    await Card.destroy({ where: { id: targetId } });

    // Retorna mensagem de confirmação
    res.json({ message: "Deletado" });
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json({ error: err?.message || err?.name || "Erro ao deletar card" });
  }
};