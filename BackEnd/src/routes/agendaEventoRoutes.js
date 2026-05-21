// Rotas da Agenda de Delivery — todas exigem autenticação JWT.
const router = require("express").Router();
const auth = require("../controllers/middleware/auth");
const c = require("../controllers/agendaEventoController");

router.use(auth);

router.get("/", c.list);
router.post("/", c.create);
router.put("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
