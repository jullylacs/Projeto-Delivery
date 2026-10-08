const router = require("express").Router();
const controller = require("../controllers/dashboardController");
const auth = require("../controllers/middleware/auth");
const escopo = require("../controllers/middleware/escopo");

// GET /dashboard/summary[?board=delivery|comercial|bko|compras|externo]
//   Resumo agregado para a tela de Dashboard (totais, SLA, breakdown por coluna,
//   performance por cargo). Substitui os 3 GETs pesados que existiam antes.
router.get("/summary", auth, escopo, controller.getDashboardSummary);

module.exports = router;
