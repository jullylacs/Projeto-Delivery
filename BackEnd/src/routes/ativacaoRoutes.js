// Roteador do fluxo "Carta de Ativação" (Depto. Delivery)
const router = require("express").Router();
const controller = require("../controllers/ativacaoController");
const auth = require("../controllers/middleware/auth");
const requireManagerOrAdmin = require("../controllers/middleware/requireManagerOrAdmin");
const escopo = require("../controllers/middleware/escopo");
const { bloqueiaExterno } = escopo;
const { ativacaoPublicLimiter } = require("../middleware/rateLimiter");

// ─── Público (sem auth) — acessado pelo técnico via link único ─────────────
router.get("/public/:token", ativacaoPublicLimiter, controller.getPublic);
router.patch("/public/:token", ativacaoPublicLimiter, controller.updatePublic);
router.post("/public/:token/concluir", ativacaoPublicLimiter, controller.concluirPublic);

// ─── Interno (auth) ──────────────────────────────────────────────────────────
// Ativações são da equipe interna e trazem dados de clientes de todos os
// vendedores — o vendedor externo não entra aqui.
const interno = [auth, escopo, bloqueiaExterno];

router.post("/", interno, controller.create);
router.get("/", interno, controller.getAll);
router.get("/:id", interno, controller.getById);
router.put("/:id", interno, controller.update);
router.delete("/:id", interno, requireManagerOrAdmin, controller.remove);

router.post("/:id/aprovar", interno, controller.aprovar);
router.post("/:id/rejeitar", interno, controller.rejeitar);
router.get("/:id/carta", interno, controller.baixarCarta);

module.exports = router;
