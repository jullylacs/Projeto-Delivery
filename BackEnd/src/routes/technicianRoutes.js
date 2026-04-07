// Roteador de técnicos
const router = require("express").Router();
const Technician = require("../models/Technician");

// POST /technicians — cadastra um novo técnico
router.post("/", async (req, res) => {
  // Cria o técnico com os dados enviados no body
  const tech = await Technician.create(req.body);
  res.json(tech);
});

// GET /technicians — retorna todos os técnicos cadastrados
router.get("/", async (req, res) => {
  // Busca todos os registros da tabela de técnicos
  const techs = await Technician.find();
  res.json(techs);
});

module.exports = router;