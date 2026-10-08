// Roteador de cards do Kanban
const router = require("express").Router();
const controller = require("../controllers/cardController");
const auth = require("../controllers/middleware/auth");
const escopo = require("../controllers/middleware/escopo");
const requireManagerOrAdmin = require("../controllers/middleware/requireManagerOrAdmin");

// Toda rota de card exige login e carrega o escopo do usuário (req.escopo).
// Ficam no router, e não rota a rota, porque o router.param abaixo precisa
// rodar depois deles — e assim uma rota nova já nasce protegida.
router.use(auth, escopo);

// Vendedor externo só passa em /cards/:id... se o card for dele.
router.param("id", controller.verificarAcessoAoCard);

// POST /cards — cria um novo card
router.post("/", controller.createCard);

// GET /cards/board-summary — snapshot inicial do Kanban (top N por coluna + totals). Aceita ?board= e ?perColumn=.
router.get("/board-summary", controller.getBoardSummary);

// ─── Lixeira (soft-delete) ───────────────────────────────────────────────────
router.get("/trash", controller.getTrash);
router.post("/:id/restore", controller.restoreCard);
router.delete("/:id/permanent", requireManagerOrAdmin, controller.permanentDeleteCard);

// ─── Arquivo ─────────────────────────────────────────────────────────────────
router.get("/archived", controller.getArchived);
router.post("/:id/archive", controller.archiveCard);
router.post("/:id/unarchive", controller.unarchiveCard);

// GET /cards — lista de cards. Modos:
//  - ?coluna_id=X&offset=N&limit=M → paginação dentro de uma coluna (usado pelo "Ver mais")
//  - ?board=delivery|comercial|bko|compras → lista global do board (evite em produção, prefira board-summary)
router.get("/", controller.getCards);

// POST /cards/:id/transfer — move um card entre boards diferentes (audita via comentário).
router.post("/:id/transfer", controller.transferCard);

// ─── Comentários (operações atômicas no JSONB) ──────────────────────────────
router.post("/:id/comments", controller.addComment);
router.patch("/:id/comments/:commentId", controller.editComment);
router.delete("/:id/comments/:commentId", controller.deleteComment);

router.post("/:id/comments/:commentId/replies", controller.addReply);
router.patch("/:id/comments/:commentId/replies/:replyId", controller.editReply);
router.delete("/:id/comments/:commentId/replies/:replyId", controller.deleteReply);

router.patch("/:id/comments/:commentId/pin", controller.pinComment);
router.post("/:id/comments/:commentId/reactions", controller.toggleReaction);

// GET /cards/:id — busca um card por ID (ex: para descobrir seu board via notificação)
router.get("/:id", controller.getCardById);

// PUT /cards/:id — atualiza os dados de um card específico
router.put("/:id", controller.updateCard);

// DELETE /cards/:id — remove um card pelo ID
router.delete("/:id", controller.deleteCard);

module.exports = router;