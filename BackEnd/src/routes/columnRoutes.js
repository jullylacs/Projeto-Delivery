const router = require("express").Router();
const controller = require("../controllers/columnController");
const escopo = require("../controllers/middleware/escopo");
const { bloqueiaExterno } = escopo;

// `auth` já é aplicado no app.js, na montagem deste router.
router.use(escopo);

router.get("/", controller.getColumns);

// Estrutura do Kanban é da equipe interna: o vendedor externo só lê as colunas.
// (DELETE /:id/cards apagaria os cards de TODOS os vendedores da coluna.)
router.post("/", bloqueiaExterno, controller.createColumn);
router.put("/reorder", bloqueiaExterno, controller.reorderColumns);
router.put("/:id", bloqueiaExterno, controller.updateColumn);
router.delete("/:id/cards", bloqueiaExterno, controller.clearColumnCards);
router.delete("/:id", bloqueiaExterno, controller.deleteColumn);

module.exports = router;