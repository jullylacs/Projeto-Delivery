const router = require("express").Router();
const auth = require("../controllers/middleware/auth");
const controller = require("../controllers/notificationController");

router.post("/sync", auth, controller.syncMine);
router.get("/", auth, controller.listMine);
router.patch("/read-all", auth, controller.markAllAsRead);
router.patch("/:id/read", auth, controller.markOneAsRead);
router.patch("/clear-read", auth, controller.clearRead);

module.exports = router;
