const Schedule = require("../models/Schedule"); // Importa o model de agendamentos

// 🔹 Criação de um novo agendamento
exports.create = async (req, res) => {
  // Cria um novo agendamento com os dados enviados no body da requisição
  const schedule = await Schedule.create(req.body);

  // Retorna o agendamento criado
  res.json(schedule);
};

// 🔹 Listagem de todos os agendamentos
exports.getAll = async (req, res) => {
  // Busca todos os agendamentos no banco de dados
  const schedules = await Schedule.find()
    // Substitui o ID do card pelos dados completos do card relacionado
    .populate("card")
    // Substitui o ID do técnico pelos dados completos do técnico
    .populate("tecnico");

  // Retorna a lista de agendamentos
  res.json(schedules);
};

// 🔹 Atualização de um agendamento existente
exports.update = async (req, res) => {
  // Atualiza o agendamento pelo ID informado na URL (req.params.id)
  // req.body contém os novos dados
  // { new: true } retorna o documento já atualizado
  const schedule = await Schedule.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  // Retorna o agendamento atualizado
  res.json(schedule);
};