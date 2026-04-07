// Roteador de cards do Kanban
const router = require("express").Router();
const controller = require("../controllers/cardController");

// POST /cards — cria um novo card
router.post("/", controller.createCard);

// GET /cards — retorna todos os cards (com dados do vendedor)
router.get("/", controller.getCards);

// PUT /cards/:id — atualiza os dados de um card específico
router.put("/:id", controller.updateCard);

// DELETE /cards/:id — remove um card pelo ID
router.delete("/:id", controller.deleteCard);

module.exports = router;