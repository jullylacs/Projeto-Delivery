const { randomUUID } = require("crypto");
const { Card, User, Column, sequelize } = require("../models"); // Importa o model de Card (Sequelize/PostgreSQL)
const { fn, col, where, QueryTypes, Op } = require("sequelize");

const VALID_BOARDS = ["delivery", "comercial", "bko"];
const resolveBoard = (raw) => {
  const value = String(raw || "").trim().toLowerCase();
  return VALID_BOARDS.includes(value) ? value : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de comentários — todos os updates de comments passam por aqui para
// garantir atomicidade. Cada operação usa transaction + SELECT FOR UPDATE,
// elimina race conditions do tipo last-write-wins que estavam fazendo
// comentários sumirem.
// ─────────────────────────────────────────────────────────────────────────────

async function resolveAuthorName(req) {
  const u = req.user || {};
  let name = u.username || u.nome || null;
  if (!name && u.id) {
    const dbUser = await User.findByPk(u.id);
    name = dbUser?.username || dbUser?.nome || dbUser?.email || `Usuário ${u.id}`;
  }
  if (!name) name = u.email || `Usuário ${u.id || "?"}`;
  return name;
}

async function resolveAuthor(req) {
  const u = req.user || {};
  let name = u.username || u.nome || null;
  let avatar = null;
  if ((!name || !avatar) && u.id) {
    const dbUser = await User.findByPk(u.id);
    name = name || dbUser?.username || dbUser?.nome || dbUser?.email || `Usuário ${u.id}`;
    avatar = dbUser?.avatar || null;
  }
  if (!name) name = u.email || `Usuário ${u.id || "?"}`;
  return { name, avatar };
}

function buildSystemComment(text) {
  return {
    id: `sys-${randomUUID()}`,
    text: String(text || ""),
    author: "Sistema",
    authorAvatar: null,
    createdAt: new Date().toISOString(),
    isSystem: true,
  };
}

// Aplica uma mutação no array `comments` de um card de forma atômica.
// `mutate(commentsCopy, card)` recebe uma cópia do array e deve retornar o array novo.
async function mutateCardComments(cardId, mutate) {
  return sequelize.transaction(async (t) => {
    const card = await Card.findByPk(cardId, { lock: t.LOCK.UPDATE, transaction: t });
    if (!card) {
      const err = new Error("Card não encontrado");
      err.statusCode = 404;
      throw err;
    }
    const comments = Array.isArray(card.comments) ? [...card.comments] : [];
    const next = await mutate(comments, card);
    await card.update({ comments: Array.isArray(next) ? next : comments }, { transaction: t });
    return card;
  });
}

async function appendCommentAtomically(cardId, newComment) {
  return mutateCardComments(cardId, (comments) => {
    comments.push(newComment);
    return comments;
  });
}

async function reloadCardWithRelations(cardId) {
  return Card.findByPk(cardId, {
    include: [
      { model: User, as: "vendedor", attributes: { exclude: ["senha"] } },
      { model: Column, as: "column" },
    ],
  });
}

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

  // Propaga o board da coluna para o card (frontend filtra por isso).
  const resolvedBoard = String(raw?.column?.board || "").trim().toLowerCase();
  if (VALID_BOARDS.includes(resolvedBoard)) {
    raw.board = resolvedBoard;
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

  // Lista de campos inteiros
  const intFields = ["tempoContratual", "sla", "coluna_id", "vendedor_id"];
  intFields.forEach((field) => {
    if (payload[field] === "") payload[field] = null;
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== "") {
      const parsed = parseInt(payload[field], 10);
      payload[field] = Number.isFinite(parsed) ? parsed : null;
    }
  });

  // Campos do tipo data
  const dateFields = ["prazo", "createdAt", "updatedAt"];
  dateFields.forEach((field) => {
    if (payload[field] === "") payload[field] = null;
  });

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

// 🔹 Listagem de cards. Três modos:
//  1) ?coluna_id=X[&offset=N&limit=M]  → paginação dentro de uma coluna (usado pelo "Ver mais")
//  2) ?board=delivery|comercial         → filtra cards via join na Column.board
//  3) sem parâmetros                    → retorna todos os cards (compat antigo)
exports.getCards = async (req, res) => {
  try {
    const board = resolveBoard(req.query?.board);
    const colunaIdRaw = req.query?.coluna_id ?? req.query?.colunaId;
    const colunaId = Number(colunaIdRaw);

    // Modo 1: paginação dentro de uma coluna específica.
    if (Number.isFinite(colunaId) && colunaId > 0) {
      const offset = Math.max(0, Number(req.query?.offset) || 0);
      const limit = Math.min(200, Math.max(1, Number(req.query?.limit) || 20));

      const cards = await Card.findAll({
        where: { coluna_id: colunaId },
        include: [
          { model: User, as: "vendedor", attributes: { exclude: ["senha"] } },
          { model: Column, as: "column" },
        ],
        order: [["updatedAt", "DESC"], ["id", "DESC"]],
        offset,
        limit,
      });

      return res.json(cards.map(normalizeCard));
    }

    // Modo 2/3: lista global (com filtro de board opcional). Não usar em produção
    // se a tabela for grande — prefira o /cards/board-summary para o load inicial.
    const columnInclude = {
      model: Column,
      as: "column",
      ...(board ? { where: { board }, required: true } : {}),
    };

    const cards = await Card.findAll({
      include: [
        { model: User, as: "vendedor", attributes: { exclude: ["senha"] } },
        columnInclude,
      ],
      order: [["updatedAt", "DESC"], ["id", "DESC"]],
    });

    res.json(cards.map(normalizeCard));
  } catch (err) {
    res.status(500).json({ error: err?.message || err?.name || "Erro ao listar cards" });
  }
};

// 🔹 Snapshot do Kanban — dois modos:
//
//  (a) Sem filtros: top N cards por coluna via window function + totais globais
//      por coluna. Resposta: { cards, totals, filtered: false }.
//
//  (b) Com filtros (search/vendedor_id/coluna_id): busca server-side em todo
//      o board, retorna até `limit` matches + totais derivados do match.
//      Resposta: { cards, totals, filtered: true, limited: bool }.
//
// O front esconde "Ver mais" quando filtered=true (todos os matches já vieram).
exports.getBoardSummary = async (req, res) => {
  try {
    const board = resolveBoard(req.query?.board) || "delivery";
    const perColumn = Math.min(50, Math.max(1, Number(req.query?.perColumn) || 5));

    const search = String(req.query?.search || "").trim();
    const vendorIdRaw = req.query?.vendedor_id ?? req.query?.vendedorId;
    const vendorId = Number(vendorIdRaw);
    const columnFilterRaw = req.query?.coluna_id ?? req.query?.colunaId;
    const columnFilterId = Number(columnFilterRaw);

    const hasSearch = search.length > 0;
    const hasVendor = Number.isFinite(vendorId) && vendorId > 0;
    const hasColumnFilter = Number.isFinite(columnFilterId) && columnFilterId > 0;
    const isFiltered = hasSearch || hasVendor || hasColumnFilter;

    // ──────────────────────────────────────────────────────────────────
    // Modo (b): filtros ativos — busca server-side com Sequelize.
    // ──────────────────────────────────────────────────────────────────
    if (isFiltered) {
      const limit = Math.min(2000, Math.max(1, Number(req.query?.limit) || 500));

      const cardWhere = {};
      if (hasVendor) cardWhere.vendedor_id = vendorId;
      if (hasColumnFilter) cardWhere.coluna_id = columnFilterId;
      if (hasSearch) {
        const term = `%${search}%`;
        cardWhere[Op.or] = [
          { cliente: { [Op.iLike]: term } },
          { titulo: { [Op.iLike]: term } },
          { telefone: { [Op.iLike]: term } },
          { endereco: { [Op.iLike]: term } },
          { observacoes: { [Op.iLike]: term } },
          { tipoServico: { [Op.iLike]: term } },
          { ip: { [Op.iLike]: term } },
        ];
      }

      const found = await Card.findAll({
        where: cardWhere,
        include: [
          { model: User, as: "vendedor", attributes: { exclude: ["senha"] } },
          { model: Column, as: "column", where: { board }, required: true },
        ],
        order: [["updatedAt", "DESC"], ["id", "DESC"]],
        limit: limit + 1, // pega 1 a mais para detectar truncamento
      });

      const limited = found.length > limit;
      const cards = (limited ? found.slice(0, limit) : found).map(normalizeCard);

      const totals = {};
      for (const c of cards) {
        const key = String(c.coluna_id);
        if (key && key !== "undefined" && key !== "null") {
          totals[key] = (totals[key] || 0) + 1;
        }
      }

      return res.json({ cards, totals, filtered: true, limited });
    }

    // ──────────────────────────────────────────────────────────────────
    // Modo (a): sem filtros — top N por coluna via window function.
    // ──────────────────────────────────────────────────────────────────
    const topRows = await sequelize.query(
      `SELECT id
         FROM (
           SELECT c.id,
                  ROW_NUMBER() OVER (
                    PARTITION BY c.coluna_id
                    ORDER BY c."updatedAt" DESC, c.id DESC
                  ) AS rn
             FROM cards c
             JOIN columns col ON col.id = c.coluna_id
            WHERE col.board = :board
         ) sub
        WHERE sub.rn <= :perColumn`,
      {
        replacements: { board, perColumn },
        type: QueryTypes.SELECT,
      }
    );

    const ids = topRows.map((row) => row.id).filter(Number.isFinite);

    const cards = ids.length > 0
      ? await Card.findAll({
          where: { id: ids },
          include: [
            { model: User, as: "vendedor", attributes: { exclude: ["senha"] } },
            { model: Column, as: "column" },
          ],
          order: [["updatedAt", "DESC"], ["id", "DESC"]],
        })
      : [];

    const countRows = await sequelize.query(
      `SELECT c.coluna_id, COUNT(*)::int AS total
         FROM cards c
         JOIN columns col ON col.id = c.coluna_id
        WHERE col.board = :board
        GROUP BY c.coluna_id`,
      {
        replacements: { board },
        type: QueryTypes.SELECT,
      }
    );

    const totals = {};
    for (const row of countRows) {
      if (row?.coluna_id != null) {
        totals[String(row.coluna_id)] = Number(row.total) || 0;
      }
    }

    return res.json({
      cards: cards.map(normalizeCard),
      totals,
      filtered: false,
      limited: false,
    });
  } catch (err) {
    console.error("[getBoardSummary] Erro:", err);
    return res.status(500).json({ error: err?.message || "Erro ao gerar resumo do board" });
  }
};

// 🔹 Transfere um card entre Kanbans (delivery ↔ comercial).
// Body: { coluna_id } — coluna alvo no outro board. Cria comentário de sistema.
exports.transferCard = async (req, res) => {
  try {
    const targetId = req.params.id;
    const targetColumnId = Number(req.body?.coluna_id ?? req.body?.colunaId);

    if (!Number.isFinite(targetColumnId)) {
      return res.status(400).json({ error: "coluna_id alvo é obrigatório" });
    }

    const existing = await Card.findByPk(targetId, {
      include: [{ model: Column, as: "column" }],
    });
    if (!existing) {
      return res.status(404).json({ error: "Card não encontrado" });
    }

    const targetColumn = await Column.findByPk(targetColumnId);
    if (!targetColumn) {
      return res.status(404).json({ error: "Coluna de destino não encontrada" });
    }

    const fromBoard = existing.column?.board || "delivery";
    const toBoard = targetColumn.board;

    if (fromBoard === toBoard) {
      return res.status(400).json({ error: "Coluna de destino pertence ao mesmo board. Use atualização normal de card." });
    }

    // Nome do usuário para o comentário de sistema (mesmo padrão de updateCard).
    let user = req.user || {};
    let userName = user.username || user.nome || null;
    if (!userName && user.id) {
      const dbUser = await User.findByPk(user.id);
      userName = dbUser?.username || dbUser?.nome || dbUser?.email || `Usuário ${user.id}`;
    }
    if (!userName) {
      userName = user.email || `Usuário ${user.id || "?"}`;
    }

    const fromBoardLabel = fromBoard === "comercial" ? "Comercial" : "Delivery";
    const toBoardLabel = toBoard === "comercial" ? "Comercial" : "Delivery";

    const systemComment = {
      id: `sys-${Date.now()}`,
      text: `${userName} transferiu o card de ${fromBoardLabel} para ${toBoardLabel} (coluna "${targetColumn.nome}").`,
      author: "Sistema",
      authorAvatar: null,
      createdAt: new Date(),
      isSystem: true,
    };

    const comments = Array.isArray(existing.comments) ? [...existing.comments, systemComment] : [systemComment];

    await Card.update(
      { coluna_id: targetColumn.id, comments },
      { where: { id: targetId } }
    );

    const updated = await Card.findByPk(targetId, {
      include: [
        { model: User, as: "vendedor", attributes: { exclude: ["senha"] } },
        { model: Column, as: "column" },
      ],
    });

    return res.json(normalizeCard(updated));
  } catch (err) {
    console.error("[transferCard] Erro:", err);
    return res.status(500).json({ error: err?.message || "Erro ao transferir card" });
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

    // Recusa atualização normal que cruzaria boards. Para isso há o endpoint
    // dedicado POST /cards/:id/transfer (audita via comentário de sistema).
    if (existing.coluna_id !== payload.coluna_id) {
      const fromColumn = await Column.findByPk(existing.coluna_id);
      const toColumn = await Column.findByPk(payload.coluna_id);
      if (fromColumn?.board && toColumn?.board && fromColumn.board !== toColumn.board) {
        return res.status(400).json({
          error: "Para mover um card entre Delivery e Comercial use POST /cards/:id/transfer.",
        });
      }
    }

    // Detecta mudanças relevantes para comentário do sistema
    let systemComment = null;
    const userName = await resolveAuthorName(req);
    // Busca o nome diretamente no banco como fonte definitiva (bypass de quirks do JWT)
    const [_userRow] = await sequelize.query(
      "SELECT nome, email FROM users WHERE id = :id LIMIT 1",
      { replacements: { id: Number(req.userId) || 0 }, type: QueryTypes.SELECT }
    );
    const atualizadoPorNome = _userRow?.nome || _userRow?.email || userName || null;
    // Mudança de coluna
    if (existing.coluna_id !== payload.coluna_id) {
      const ColumnModel = require("../models/Column");
      const fromColumn = await ColumnModel.findByPk(existing.coluna_id);
      const toColumn = await ColumnModel.findByPk(payload.coluna_id);
      const fromName = fromColumn?.nome || "(desconhecida)";
      const toName = toColumn?.nome || "(desconhecida)";
      systemComment = buildSystemComment(`${userName} moveu o card de "${fromName}" para "${toName}"`);
    } else {
      // Mudança de detalhes (exceto coluna)
      const fieldsToCheck = [
        "titulo", "cliente", "telefone", "endereco", "coordenadas", "tipoServico",
        "mensalidade", "instalacao", "tipo_card", "sla", "prazo", "tempoContratual",
        "observacoes", "vendedor_id"
      ];
      const changed = fieldsToCheck.some(field => {
        const oldVal = JSON.stringify(existing[field] ?? null);
        const newVal = JSON.stringify(payload[field] ?? null);
        return oldVal !== newVal;
      });
      if (changed) {
        systemComment = buildSystemComment(`${userName} editou os detalhes do card.`);
      }
    }

    // 🔒 Comentários NUNCA são sobrescritos via updateCard — frontend deve usar
    // os endpoints REST atômicos /cards/:id/comments. Isso evita race condition
    // (last-write-wins) que estava perdendo comentários adicionados em paralelo.
    delete payload.comments;
    // Remove do payload do ORM para não sobrescrever com null antes do nosso SQL
    delete payload.atualizado_por_nome;

    await Card.update(payload, { where: { id: targetId } });

    // Salva o nome do atualizador via SQL direto
    await sequelize.query(
      `UPDATE cards SET atualizado_por_nome = :nome WHERE id = :id`,
      { replacements: { nome: atualizadoPorNome, id: Number(targetId) }, type: QueryTypes.UPDATE }
    );

    // Se houver comentário do sistema, faz append atômico (SELECT FOR UPDATE).
    if (systemComment) {
      await appendCommentAtomically(targetId, systemComment);
    }

    // Busca o card já atualizado para retornar ao cliente
    const card = await Card.findByPk(targetId, {
      include: [
        { model: User, as: "vendedor", attributes: { exclude: ["senha"] } },
        { model: Column, as: "column" },
      ],
    });

    const normalized = normalizeCard(card);
    normalized.atualizado_por_nome = atualizadoPorNome;
    res.json(normalized);
  } catch (err) {
    // Log detalhado para depuração
    console.error("[updateCard] Erro ao atualizar card:", {
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
      body: req.body,
      params: req.params,
    });
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

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints REST atômicos para comentários, respostas e reações.
// Cada operação executa dentro de uma transação com SELECT FOR UPDATE, então
// dois usuários comentando ao mesmo tempo não perdem nada.
// ─────────────────────────────────────────────────────────────────────────────

function parseCardId(raw) {
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

function handleControllerError(res, err, fallback) {
  if (err?.statusCode) return res.status(err.statusCode).json({ error: err.message });
  console.error(`[${fallback}] Erro:`, err);
  return res.status(500).json({ error: err?.message || fallback });
}

// 🔹 POST /cards/:id/comments — adiciona um comentário
exports.addComment = async (req, res) => {
  try {
    const cardId = parseCardId(req.params.id);
    if (!cardId) return res.status(400).json({ error: "ID inválido" });

    const text = String(req.body?.text || "").trim();
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
    if (!text && attachments.length === 0) {
      return res.status(400).json({ error: "Comentário vazio" });
    }

    const { name, avatar } = await resolveAuthor(req);
    const newComment = {
      id: randomUUID(),
      text,
      author: name,
      authorAvatar: avatar,
      createdAt: new Date().toISOString(),
      ...(attachments.length > 0 ? { attachments } : {}),
    };

    await appendCommentAtomically(cardId, newComment);
    const full = await reloadCardWithRelations(cardId);
    return res.json(normalizeCard(full));
  } catch (err) {
    return handleControllerError(res, err, "Erro ao adicionar comentário");
  }
};

// 🔹 PATCH /cards/:id/comments/:commentId — edita um comentário (por id)
exports.editComment = async (req, res) => {
  try {
    const cardId = parseCardId(req.params.id);
    const commentId = String(req.params.commentId || "");
    const text = String(req.body?.text || "").trim();
    if (!cardId || !commentId) return res.status(400).json({ error: "Parâmetros inválidos" });
    if (!text) return res.status(400).json({ error: "Texto vazio" });

    let found = false;
    await mutateCardComments(cardId, (comments) => {
      return comments.map((c) => {
        if (String(c.id) !== commentId) return c;
        found = true;
        return { ...c, text, updatedAt: new Date().toISOString() };
      });
    });

    if (!found) return res.status(404).json({ error: "Comentário não encontrado" });
    const full = await reloadCardWithRelations(cardId);
    return res.json(normalizeCard(full));
  } catch (err) {
    return handleControllerError(res, err, "Erro ao editar comentário");
  }
};

// 🔹 PATCH /cards/:id/comments/:commentId/pin — fixa ou desfixa um comentário
exports.pinComment = async (req, res) => {
  try {
    const cardId = parseCardId(req.params.id);
    const commentId = String(req.params.commentId || "");
    if (!cardId || !commentId) return res.status(400).json({ error: "Parâmetros inválidos" });

    let found = false;
    let newPinned = false;
    await mutateCardComments(cardId, (comments) => {
      return comments.map((c) => {
        if (String(c.id) !== commentId) return c;
        found = true;
        newPinned = !c.pinned;
        return { ...c, pinned: newPinned };
      });
    });

    if (!found) return res.status(404).json({ error: "Comentário não encontrado" });
    const full = await reloadCardWithRelations(cardId);
    return res.json(normalizeCard(full));
  } catch (err) {
    return handleControllerError(res, err, "Erro ao fixar comentário");
  }
};

// 🔹 DELETE /cards/:id/comments/:commentId — remove um comentário (por id)
exports.deleteComment = async (req, res) => {
  try {
    const cardId = parseCardId(req.params.id);
    const commentId = String(req.params.commentId || "");
    if (!cardId || !commentId) return res.status(400).json({ error: "Parâmetros inválidos" });

    let found = false;
    await mutateCardComments(cardId, (comments) => {
      const next = comments.filter((c) => {
        if (String(c.id) === commentId) {
          found = true;
          return false;
        }
        return true;
      });
      return next;
    });

    if (!found) return res.status(404).json({ error: "Comentário não encontrado" });
    const full = await reloadCardWithRelations(cardId);
    return res.json(normalizeCard(full));
  } catch (err) {
    return handleControllerError(res, err, "Erro ao excluir comentário");
  }
};

// 🔹 POST /cards/:id/comments/:commentId/replies — adiciona uma resposta
exports.addReply = async (req, res) => {
  try {
    const cardId = parseCardId(req.params.id);
    const commentId = String(req.params.commentId || "");
    const text = String(req.body?.text || "").trim();
    if (!cardId || !commentId) return res.status(400).json({ error: "Parâmetros inválidos" });
    if (!text) return res.status(400).json({ error: "Texto vazio" });

    const { name, avatar } = await resolveAuthor(req);
    const newReply = {
      id: randomUUID(),
      text,
      author: name,
      authorAvatar: avatar,
      createdAt: new Date().toISOString(),
    };

    let found = false;
    await mutateCardComments(cardId, (comments) => {
      return comments.map((c) => {
        if (String(c.id) !== commentId) return c;
        found = true;
        const replies = Array.isArray(c.replies) ? [...c.replies, newReply] : [newReply];
        return { ...c, replies };
      });
    });

    if (!found) return res.status(404).json({ error: "Comentário não encontrado" });
    const full = await reloadCardWithRelations(cardId);
    return res.json(normalizeCard(full));
  } catch (err) {
    return handleControllerError(res, err, "Erro ao adicionar resposta");
  }
};

// 🔹 PATCH /cards/:id/comments/:commentId/replies/:replyId — edita resposta (por id)
exports.editReply = async (req, res) => {
  try {
    const cardId = parseCardId(req.params.id);
    const commentId = String(req.params.commentId || "");
    const replyId = String(req.params.replyId || "");
    const text = String(req.body?.text || "").trim();
    if (!cardId || !commentId || !replyId) return res.status(400).json({ error: "Parâmetros inválidos" });
    if (!text) return res.status(400).json({ error: "Texto vazio" });

    let found = false;
    await mutateCardComments(cardId, (comments) => {
      return comments.map((c) => {
        if (String(c.id) !== commentId) return c;
        const replies = Array.isArray(c.replies)
          ? c.replies.map((r) => {
              if (String(r.id) !== replyId) return r;
              found = true;
              return { ...r, text, editedAt: new Date().toISOString() };
            })
          : [];
        return { ...c, replies };
      });
    });

    if (!found) return res.status(404).json({ error: "Resposta não encontrada" });
    const full = await reloadCardWithRelations(cardId);
    return res.json(normalizeCard(full));
  } catch (err) {
    return handleControllerError(res, err, "Erro ao editar resposta");
  }
};

// 🔹 DELETE /cards/:id/comments/:commentId/replies/:replyId — remove resposta
exports.deleteReply = async (req, res) => {
  try {
    const cardId = parseCardId(req.params.id);
    const commentId = String(req.params.commentId || "");
    const replyId = String(req.params.replyId || "");
    if (!cardId || !commentId || !replyId) return res.status(400).json({ error: "Parâmetros inválidos" });

    let found = false;
    await mutateCardComments(cardId, (comments) => {
      return comments.map((c) => {
        if (String(c.id) !== commentId) return c;
        const replies = Array.isArray(c.replies)
          ? c.replies.filter((r) => {
              if (String(r.id) === replyId) {
                found = true;
                return false;
              }
              return true;
            })
          : [];
        return { ...c, replies };
      });
    });

    if (!found) return res.status(404).json({ error: "Resposta não encontrada" });
    const full = await reloadCardWithRelations(cardId);
    return res.json(normalizeCard(full));
  } catch (err) {
    return handleControllerError(res, err, "Erro ao excluir resposta");
  }
};

// 🔹 POST /cards/:id/comments/:commentId/reactions — toggle de reação por emoji
exports.toggleReaction = async (req, res) => {
  try {
    const cardId = parseCardId(req.params.id);
    const commentId = String(req.params.commentId || "");
    const emoji = String(req.body?.emoji || "").trim();
    if (!cardId || !commentId) return res.status(400).json({ error: "Parâmetros inválidos" });
    if (!emoji) return res.status(400).json({ error: "Emoji obrigatório" });

    const { name } = await resolveAuthor(req);
    const userKey = String(name).trim().toLowerCase();

    let found = false;
    await mutateCardComments(cardId, (comments) => {
      return comments.map((c) => {
        if (String(c.id) !== commentId) return c;
        found = true;
        const reactions = c?.reactions && typeof c.reactions === "object" ? { ...c.reactions } : {};
        const users = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
        const already = users.some((u) => String(u).trim().toLowerCase() === userKey);
        const nextUsers = already
          ? users.filter((u) => String(u).trim().toLowerCase() !== userKey)
          : [...users, name];
        if (nextUsers.length > 0) reactions[emoji] = nextUsers;
        else delete reactions[emoji];
        return { ...c, reactions };
      });
    });

    if (!found) return res.status(404).json({ error: "Comentário não encontrado" });
    const full = await reloadCardWithRelations(cardId);
    return res.json(normalizeCard(full));
  } catch (err) {
    return handleControllerError(res, err, "Erro ao reagir ao comentário");
  }
};