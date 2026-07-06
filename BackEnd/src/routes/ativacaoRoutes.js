// Roteador do fluxo "Carta de Ativação" (Depto. Delivery)
const router = require("express").Router();
const controller = require("../controllers/ativacaoController");
const auth = require("../controllers/middleware/auth");
const requireManagerOrAdmin = require("../controllers/middleware/requireManagerOrAdmin");
const { ativacaoPublicLimiter } = require("../middleware/rateLimiter");

// ─── Público (sem auth) — acessado pelo técnico via link único ─────────────
router.get("/public/:token", ativacaoPublicLimiter, controller.getPublic);
router.patch("/public/:token", ativacaoPublicLimiter, controller.updatePublic);
router.post("/public/:token/concluir", ativacaoPublicLimiter, controller.concluirPublic);

// ─── Interno (auth) ──────────────────────────────────────────────────────────
router.post("/", auth, controller.create);
router.get("/", auth, controller.getAll);
router.get("/:id", auth, controller.getById);
router.put("/:id", auth, controller.update);
router.delete("/:id", auth, requireManagerOrAdmin, controller.remove);

router.post("/:id/aprovar", auth, controller.aprovar);
router.post("/:id/rejeitar", auth, controller.rejeitar);
router.get("/:id/carta", auth, controller.baixarCarta);

module.exports = router;
