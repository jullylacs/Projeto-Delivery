const express = require("express");
const router = express.Router();
const controller = require("../controllers/ramalController");
const auth = require("../controllers/middleware/auth");

router.get("/", auth, controller.getAllRamais);
router.post("/", auth, controller.createRamal);
router.put("/:id", auth, controller.updateRamal);
router.delete("/:id", auth, controller.deleteRamal);

module.exports = router;
