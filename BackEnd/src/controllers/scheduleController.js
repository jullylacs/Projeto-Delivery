const { Schedule, Card, Technician } = require("../models"); // Importa models via index centralizado

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

  return payload;
};

// 🔹 Criação de um novo agendamento
exports.create = async (req, res) => {
  try {
    const payload = normalizeSchedulePayload(req.body);
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
    await Schedule.update(payload, { where: { id: req.params.id } });

    // Retorna o agendamento atualizado com dados relacionados
    const schedule = await Schedule.findByPk(req.params.id, {
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
    const deleted = await Schedule.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ message: "Agendamento não encontrado" });
    }

    return res.json({ message: "Agendamento removido" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};