// Roteador de cards do Kanban
const router = require("express").Router();
const controller = require("../controllers/cardController");
const auth = require("../controllers/middleware/auth");

// POST /cards — cria um novo card
router.post("/", auth, controller.createCard);

// GET /cards/board-summary — snapshot inicial do Kanban (top N por coluna + totals). Aceita ?board= e ?perColumn=.
router.get("/board-summary", auth, controller.getBoardSummary);

// GET /cards — lista de cards. Modos:
//  - ?coluna_id=X&offset=N&limit=M → paginação dentro de uma coluna (usado pelo "Ver mais")
//  - ?board=delivery|comercial      → lista global do board (evite em produção, prefira board-summary)
router.get("/", auth, controller.getCards);

// POST /cards/:id/transfer — move um card entre Delivery e Comercial (audita via comentário).
router.post("/:id/transfer", auth, controller.transferCard);

// ─── Comentários (operações atômicas no JSONB) ──────────────────────────────
router.post("/:id/comments", auth, controller.addComment);
router.patch("/:id/comments/:commentId", auth, controller.editComment);
router.delete("/:id/comments/:commentId", auth, controller.deleteComment);

router.post("/:id/comments/:commentId/replies", auth, controller.addReply);
router.patch("/:id/comments/:commentId/replies/:replyId", auth, controller.editReply);
router.delete("/:id/comments/:commentId/replies/:replyId", auth, controller.deleteReply);

router.post("/:id/comments/:commentId/reactions", auth, controller.toggleReaction);

// PUT /cards/:id — atualiza os dados de um card específico
router.put("/:id", auth, controller.updateCard);

// DELETE /cards/:id — remove um card pelo ID
router.delete("/:id", auth, controller.deleteCard);

module.exports = router;