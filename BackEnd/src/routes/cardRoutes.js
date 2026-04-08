// Roteador de cards do Kanban
const router = require("express").Router();
const controller = require("../controllers/cardController");
const auth = require("../controllers/middleware/auth");

// POST /cards — cria um novo card
router.post("/", auth, controller.createCard);

// GET /cards — retorna todos os cards (com dados do vendedor)
router.get("/", auth, controller.getCards);

// PUT /cards/:id — atualiza os dados de um card específico
router.put("/:id", auth, controller.updateCard);

// DELETE /cards/:id — remove um card pelo ID
router.delete("/:id", auth, controller.deleteCard);

module.exports = router;