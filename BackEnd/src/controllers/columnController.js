const { Column, Card } = require("../models");
const { fn, col, where } = require("sequelize");

const DEFAULT_COLUMNS = [
  "Novo",
  "Em análise",
  "Agendamento",
  "Agendado",
  "Em execução",
  "Concluído",
  "Inativo",
];

const normalizeColumn = (column) => {
  const raw = column?.toJSON ? column.toJSON() : { ...column };
  if (!raw) return raw;
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

exports.getColumns = async (req, res) => {
  try {
    let columns = await Column.findAll({ order: [["ordem", "ASC"], ["id", "ASC"]] });

    // Auto-seed das colunas padrão caso o banco esteja vazio.
    if (columns.length === 0) {
      const now = new Date();
      await Column.bulkCreate(
        DEFAULT_COLUMNS.map((nome, index) => ({ nome, ordem: index, createdAt: now, updatedAt: now }))
      );
      columns = await Column.findAll({ order: [["ordem", "ASC"], ["id", "ASC"]] });
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

    if (!nome) {
      return res.status(400).json({ message: "Nome da coluna é obrigatório" });
    }

    const duplicate = await findColumnByNameCI(nome);
    if (duplicate) {
      return res.status(409).json({ message: "Já existe uma coluna com esse nome" });
    }

    const maxOrder = (await Column.max("ordem")) ?? -1;
    const created = await Column.create({
      nome,
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

    const duplicate = await findColumnByNameCI(nextName);
    if (duplicate && duplicate.id !== column.id) {
      return res.status(409).json({ message: "Já existe uma coluna com esse nome" });
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

    await Promise.all(
      ids.map((id, index) => Column.update({ ordem: index }, { where: { id } }))
    );

    const ordered = await Column.findAll({ order: [["ordem", "ASC"], ["id", "ASC"]] });
    return res.json(ordered.map(normalizeColumn));
  } catch (err) {
    return res.status(500).json({ message: "Erro ao reordenar colunas", error: err?.message });
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

    await column.destroy();

    const ordered = await Column.findAll({ order: [["ordem", "ASC"], ["id", "ASC"]] });
    await Promise.all(
      ordered.map((item, index) => item.update({ ordem: index }))
    );

    return res.json({ message: "Coluna excluída" });
  } catch (err) {
    return res.status(500).json({ message: "Erro ao excluir coluna", error: err?.message });
  }
};