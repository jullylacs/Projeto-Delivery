const Role = require("../models/Role");

// Lista todos os cargos
exports.getAll = async (req, res) => {
  try {
    const roles = await Role.findAll({ order: [["nome", "ASC"]] });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar cargos", error: err.message });
  }
};

// Cria um novo cargo
exports.create = async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ message: "Nome do cargo é obrigatório" });
    const exists = await Role.findOne({ where: { nome } });
    if (exists) return res.status(409).json({ message: "Cargo já existe" });
    const role = await Role.create({ nome, descricao });
    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ message: "Erro ao criar cargo", error: err.message });
  }
};

// Remove um cargo
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Role.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ message: "Cargo não encontrado" });
    res.json({ message: "Cargo removido" });
  } catch (err) {
    res.status(500).json({ message: "Erro ao remover cargo", error: err.message });
  }
};
// Edita um cargo
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao } = req.body;
    const role = await Role.findByPk(id);
    if (!role) return res.status(404).json({ message: "Cargo não encontrado" });
    if (nome) {
      // Verifica se já existe outro cargo com esse nome
      const exists = await Role.findOne({ where: { nome, id: { [require('sequelize').Op.ne]: id } } });
      if (exists) return res.status(409).json({ message: "Já existe outro cargo com esse nome" });
      role.nome = nome;
    }
    if (descricao !== undefined) role.descricao = descricao;
    await role.save();
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: "Erro ao editar cargo", error: err.message });
  }
};
