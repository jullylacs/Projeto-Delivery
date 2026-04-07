const router = require("express").Router();
const controller = require("../controllers/userController");
const { loginLimiter } = require("../middleware/rateLimiter");
const auth = require("../controllers/middleware/auth");
const requireAdmin = require("../controllers/middleware/requireAdmin");

router.post("/register", controller.register);
router.post("/login", loginLimiter, controller.login);

// Rotas administrativas
router.get("/admin", auth, requireAdmin, controller.getAll);
router.put("/admin/:id", auth, requireAdmin, controller.adminUpdateUser);
router.delete("/admin/:id", auth, requireAdmin, controller.adminDeleteUser);

// Rotas protegidas
router.get("/:id", auth, controller.getUserProfile);
router.put("/:id", auth, controller.updateUserProfile);

module.exports = router;