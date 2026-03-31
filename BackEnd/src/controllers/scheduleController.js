const { Schedule, Card, Technician } = require("../models"); // Importa models via index centralizado

// 🔹 Criação de um novo agendamento
exports.create = async (req, res) => {
  try {
    const schedule = await Schedule.create(req.body);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    await Schedule.update(req.body, { where: { id: req.params.id } });

    // Retorna o agendamento atualizado com dados relacionados
    const schedule = await Schedule.findByPk(req.params.id, {
      include: [
        { model: Card,       as: "card"    },
        { model: Technician, as: "tecnico" }
      ]
    });

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};