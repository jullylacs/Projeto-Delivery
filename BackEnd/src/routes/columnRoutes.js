const router = require("express").Router();
const controller = require("../controllers/columnController");

router.get("/", controller.getColumns);
router.post("/", controller.createColumn);
router.put("/reorder", controller.reorderColumns);
router.put("/:id", controller.updateColumn);
router.delete("/:id", controller.deleteColumn);

module.exports = router;