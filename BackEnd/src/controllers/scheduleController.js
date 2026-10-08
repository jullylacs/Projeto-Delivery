const { Schedule, Card, Column, Technician } = require("../models"); // Importa models via index centralizado
const { BOARD_EXTERNO } = require("./middleware/escopo");

// Vendedor externo só alcança os agendamentos que ele mesmo criou.
// `req.escopo` vem do middleware `escopo` (scheduleRoutes).
const ehExterno = (req) => Boolean(req.escopo?.externo);
const filtroDono = (req) => (ehExterno(req) ? { criado_por: req.escopo.userId } : {});

// O externo só pode amarrar o agendamento a um card dele, do board Externo.
const cardForaDoEscopo = async (req, cardId) => {
  if (!ehExterno(req) || cardId === null) return false;
  const card = await Card.findOne({
    where: { id: cardId, criado_por: req.escopo.userId },
    attributes: ["id"],
    include: [{ model: Column, as: "column", attributes: [], where: { board: BOARD_EXTERNO }, required: true }],
  });
  return !card;
};

const toNullableInt = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeSchedulePayload = (body = {}) => {
  const payload = { ...body };
  payload.card_id = toNullableInt(body.card_id);
  payload.tecnico_id = toNullableInt(body.tecnico_id);

  if (typeof body.titulo === "string") payload.titulo = body.titulo.trim();
  if (typeof body.notas === "string") payload.notas = body.notas.trim();

  // Dono do agendamento nunca vem do cliente — `create` grava a partir do token.
  delete payload.criado_por;

  return payload;
};

// 🔹 Criação de um novo agendamento
exports.create = async (req, res) => {
  try {
    const payload = normalizeSchedulePayload(req.body);
    if (await cardForaDoEscopo(req, payload.card_id)) {
      return res.status(404).json({ message: "Card não encontrado" });
    }
    payload.criado_por = Number(req.userId) || null;

    const schedule = await Schedule.create(payload);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar agendamento", error: err.message });
  }
};

// 🔹 Listagem de todos os agendamentos com dados relacionados
exports.getAll = async (req, res) => {
  try {
    const schedules = await Schedule.findAll({
      where: filtroDono(req),
      include: [
        { model: Card,       as: "card"    }, // Dados completos do card vinculado
        { model: Technician, as: "tecnico" }  // Dados completos do técnico
      ],
      order: [["data", "ASC"]]
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Atualização de um agendamento existente
exports.update = async (req, res) => {
  try {
    const payload = normalizeSchedulePayload(req.body);
    if (await cardForaDoEscopo(req, payload.card_id)) {
      return res.status(404).json({ message: "Card não encontrado" });
    }

    const where = { id: req.params.id, ...filtroDono(req) };
    await Schedule.update(payload, { where });

    // Retorna o agendamento atualizado com dados relacionados
    const schedule = await Schedule.findOne({
      where,
      include: [
        { model: Card,       as: "card"    },
        { model: Technician, as: "tecnico" }
      ]
    });

    if (!schedule) {
      return res.status(404).json({ message: "Agendamento não encontrado" });
    }

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar agendamento", error: err.message });
  }
};

// 🔹 Exclusão de um agendamento
exports.remove = async (req, res) => {
  try {
    const deleted = await Schedule.destroy({ where: { id: req.params.id, ...filtroDono(req) } });
    if (!deleted) {
      return res.status(404).json({ message: "Agendamento não encontrado" });
    }

    return res.json({ message: "Agendamento removido" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};