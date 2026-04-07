// Roteador de agendamentos de instalações
const router = require("express").Router();
const controller = require("../controllers/scheduleController");

// POST /schedules — cria um novo agendamento
router.post("/", controller.create);

// GET /schedules — retorna todos os agendamentos com card e técnico relacionados
router.get("/", controller.getAll);

// PUT /schedules/:id — atualiza um agendamento existente
router.put("/:id", controller.update);

module.exports = router;