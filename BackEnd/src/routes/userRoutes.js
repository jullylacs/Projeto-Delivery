const router = require("express").Router();
const controller = require("../controllers/userController");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/:id", controller.getUserProfile);
router.put("/:id", controller.updateUserProfile);

module.exports = router;