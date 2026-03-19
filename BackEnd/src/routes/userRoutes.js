const router = require("express").Router();
const controller = require("../controllers/userController");

router.post("/register", controller.register);
router.post("/login", controller.login);

module.exports = router;