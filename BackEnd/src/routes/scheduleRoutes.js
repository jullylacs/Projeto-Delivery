const router = require("express").Router();
const controller = require("../controllers/scheduleController");

router.post("/", controller.create);
router.get("/", controller.getAll);
router.put("/:id", controller.update);

module.exports = router;