const { Column, Card } = require("../models");
const { fn, col, where, Op } = require("sequelize");

const VALID_BOARDS = ["delivery", "comercial"];

const DEFAULT_DELIVERY_COLUMNS = [
  "Novo",
  "Em análise",
  "Agendamento",
  "Agendado",
  "Em execução",
  "Concluído",
  "Inativo",
];

const DEFAULT_COMERCIAL_COLUMNS = [
  "Novo",
  "Prospecção",
  "Qualificação",
  "Proposta",
  "Negociação",
  "Fechado",
  "Perdido",
];

const resolveBoard = (raw, fallback = "delivery") => {
  const value = String(raw || "").trim().toLowerCase();
  return VALID_BOARDS.includes(value) ? value : fallback;
};

const defaultSeedFor = (board) =>
  board === "comercial" ? DEFAULT_COMERCIAL_COLUMNS : DEFAULT_DELIVERY_COLUMNS;

const normalizeColumn = (column) => {
  const raw = column?.toJSON ? column.toJSON() : { ...column };
  if (!raw) return raw;
  if (raw.id !== undefined && raw._id === undefined) {
    raw._id = String(raw.id);
  }
  return raw;
};

const findColumnByNameCI = async (name, board) => {
  return Column.findOne({
    where: {
      board,
      [Op.and]: [where(fn("lower", col("nome")), String(name || "").trim().toLowerCase())],
    },
  });
};

exports.getColumns = async (req, res) => {
  try {
    const board = resolveBoard(req.query?.board);

    let columns = await Column.findAll({
      where: { board },
      order: [["ordem", "ASC"], ["id", "ASC"]],
    });

    // Auto-seed das colunas padrão caso o board solicitado ainda não tenha colunas.
    if (columns.length === 0) {
      const now = new Date();
      const seed = defaultSeedFor(board);
      await Column.bulkCreate(
        seed.map((nome, index) => ({ nome, ordem: index, board, createdAt: now, updatedAt: now }))
      );
      columns = await Column.findAll({
        where: { board },
        order: [["ordem", "ASC"], ["id", "ASC"]],
      });
    }

    return res.json(columns.map(normalizeColumn));
  } catch (err) {
    return res.status(500).json({ message: "Erro ao listar colunas", error: err?.message });
  }
};

exports.createColumn = async (req, res) => {
  try {
    const nome = String(req.body?.nome || "").trim();
    const limiteWip = req.body?.limiteWip ?? null;
    const board = resolveBoard(req.body?.board);

    if (!nome) {
      return res.status(400).json({ message: "Nome da coluna é obrigatório" });
    }

    const duplicate = await findColumnByNameCI(nome, board);
    if (duplicate) {
      return res.status(409).json({ message: "Já existe uma coluna com esse nome neste board" });
    }

    const maxOrder = (await Column.max("ordem", { where: { board } })) ?? -1;
    const created = await Column.create({
      nome,
      board,
      ordem: maxOrder + 1,
      limiteWip: limiteWip === null ? null : Number(limiteWip),
    });

    return res.status(201).json(normalizeColumn(created));
  } catch (err) {
    return res.status(500).json({ message: "Erro ao criar coluna", error: err?.message });
  }
};

exports.updateColumn = async (req, res) => {
  try {
    const { id } = req.params;
    const column = await Column.findByPk(id);

    if (!column) {
      return res.status(404).json({ message: "Coluna não encontrada" });
    }

    const currentName = column.nome;
    const nextName = req.body?.nome !== undefined ? String(req.body.nome || "").trim() : currentName;

    if (!nextName) {
      return res.status(400).json({ message: "Nome da coluna é obrigatório" });
    }

    const duplicate = await findColumnByNameCI(nextName, column.board);
    if (duplicate && duplicate.id !== column.id) {
      return res.status(409).json({ message: "Já existe uma coluna com esse nome neste board" });
    }

    await column.update({
      nome: nextName,
      limiteWip: req.body?.limiteWip !== undefined ? (req.body.limiteWip === null ? null : Number(req.body.limiteWip)) : column.limiteWip,
      ordem: req.body?.ordem !== undefined ? Number(req.body.ordem) : column.ordem,
    });


    const updated = await Column.findByPk(id);
    return res.json(normalizeColumn(updated));
  } catch (err) {
    return res.status(500).json({ message: "Erro ao atualizar coluna", error: err?.message });
  }
};

exports.reorderColumns = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((value) => Number(value)).filter(Number.isFinite) : [];

    if (ids.length === 0) {
      return res.status(400).json({ message: "Lista de IDs inválida" });
    }

    const columns = await Column.findAll({ where: { id: ids } });
    if (columns.length !== ids.length) {
      return res.status(400).json({ message: "Uma ou mais colunas não existem" });
    }

    // Reorder só faz sentido dentro do mesmo board — recusa misturar.
    const boards = new Set(columns.map((c) => c.board));
    if (boards.size !== 1) {
      return res.status(400).json({ message: "Reordenação deve ocorrer dentro do mesmo board" });
    }

    const [board] = boards;

    await Promise.all(
      ids.map((id, index) => Column.update({ ordem: index }, { where: { id } }))
    );

    const ordered = await Column.findAll({
      where: { board },
      order: [["ordem", "ASC"], ["id", "ASC"]],
    });
    return res.json(ordered.map(normalizeColumn));
  } catch (err) {
    return res.status(500).json({ message: "Erro ao reordenar colunas", error: err?.message });
  }
};

// Apaga TODOS os cards de uma coluna de uma única vez. Usado pelo botão
// "Excluir todos os cards da coluna" no Kanban — evita N requests do frontend.
exports.clearColumnCards = async (req, res) => {
  try {
    const { id } = req.params;
    const column = await Column.findByPk(id);

    if (!column) {
      return res.status(404).json({ message: "Coluna não encontrada" });
    }

    const removed = await Card.destroy({ where: { coluna_id: column.id } });
    return res.json({ message: "Cards removidos da coluna", removed });
  } catch (err) {
    return res.status(500).json({ message: "Erro ao excluir cards da coluna", error: err?.message });
  }
};

exports.deleteColumn = async (req, res) => {
  try {
    const { id } = req.params;
    const column = await Column.findByPk(id);

    if (!column) {
      return res.status(404).json({ message: "Coluna não encontrada" });
    }

    const cardsCount = await Card.count({ where: { coluna_id: column.id } });

    if (cardsCount > 0) {
      return res.status(409).json({ message: "Não é possível excluir coluna com cards vinculados" });
    }

    const { board } = column;
    await column.destroy();

    const ordered = await Column.findAll({
      where: { board },
      order: [["ordem", "ASC"], ["id", "ASC"]],
    });
    await Promise.all(
      ordered.map((item, index) => item.update({ ordem: index }))
    );

    return res.json({ message: "Coluna excluída" });
  } catch (err) {
    return res.status(500).json({ message: "Erro ao excluir coluna", error: err?.message });
  }
};
