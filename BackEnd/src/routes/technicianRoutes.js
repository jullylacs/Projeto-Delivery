// Roteador de técnicos
const router = require("express").Router();
const Technician = require("../models/Technician");
const auth = require("../controllers/middleware/auth");
const escopo = require("../controllers/middleware/escopo");
const { bloqueiaExterno } = escopo;

// POST /technicians — cadastra um novo técnico (equipe interna)
router.post("/", auth, escopo, bloqueiaExterno, async (req, res) => {
  try {
    // Cria o técnico com os dados enviados no body
    const tech = await Technician.create(req.body);
    res.json(tech);
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar técnico", error: error.message });
  }
});

// GET /technicians — retorna todos os técnicos cadastrados
router.get("/", auth, async (req, res) => {
  try {
    // Busca todos os registros da tabela de técnicos
    const techs = await Technician.findAll();
    res.json(techs);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar técnicos", error: error.message });
  }
});

module.exports = router;