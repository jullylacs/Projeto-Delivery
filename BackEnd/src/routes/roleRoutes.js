const express = require("express");
const router = express.Router();
const roleController = require("../controllers/roleController");

// Listar todos os cargos
router.get("/", roleController.getAll);
// Criar novo cargo
router.post("/", roleController.create);
// Remover cargo
router.delete("/:id", roleController.remove);
// Editar cargo
router.put("/:id", roleController.update);

module.exports = router;
