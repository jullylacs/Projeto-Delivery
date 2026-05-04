const Ramal = require("../models/Ramal");

exports.getAllRamais = async (req, res) => {
  try {
    const ramais = await Ramal.findAll();
    res.json(ramais);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRamal = async (req, res) => {
  try {
    const { ramal, responsavel } = req.body;
    if (!ramal || !responsavel) return res.status(400).json({ error: "ramal e responsavel são obrigatórios" });
    const novo = await Ramal.create({ ramal, responsavel });
    res.status(201).json(novo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRamal = async (req, res) => {
  try {
    const { id } = req.params;
    const { ramal, responsavel } = req.body;
    const ramalObj = await Ramal.findByPk(id);
    if (!ramalObj) return res.status(404).json({ error: "Ramal não encontrado" });
    ramalObj.ramal = ramal;
    ramalObj.responsavel = responsavel;
    await ramalObj.save();
    res.json(ramalObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRamal = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Ramal.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Ramal não encontrado" });
    res.json({ message: "Ramal excluído" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
