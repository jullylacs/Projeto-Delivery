// Roteador de agendamentos de instalações
const router = require("express").Router();
const controller = require("../controllers/scheduleController");
const auth = require("../controllers/middleware/auth");
const escopo = require("../controllers/middleware/escopo");

// POST /schedules — cria um novo agendamento
router.post("/", auth, escopo, controller.create);

// GET /schedules — retorna todos os agendamentos com card e técnico relacionados
router.get("/", auth, escopo, controller.getAll);

// PUT /schedules/:id — atualiza um agendamento existente
router.put("/:id", auth, escopo, controller.update);

// DELETE /schedules/:id — remove um agendamento existente
router.delete("/:id", auth, escopo, controller.remove);

module.exports = router;