const router = require("express").Router();
const controller = require("../controllers/dashboardController");
const auth = require("../controllers/middleware/auth");

// GET /dashboard/summary[?board=delivery|comercial]
//   Resumo agregado para a tela de Dashboard (totais, SLA, breakdown por coluna,
//   performance por cargo). Substitui os 3 GETs pesados que existiam antes.
router.get("/summary", auth, controller.getDashboardSummary);

module.exports = router;
