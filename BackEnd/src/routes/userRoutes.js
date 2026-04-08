const router = require("express").Router();
const controller = require("../controllers/userController");
const { loginLimiter } = require("../middleware/rateLimiter");
const auth = require("../controllers/middleware/auth");
const requireAdmin = require("../controllers/middleware/requireAdmin");
const requireManagerOrAdmin = require("../controllers/middleware/requireManagerOrAdmin");

router.post("/register", controller.register);
router.post("/login", loginLimiter, controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", auth, controller.logout);

// Rotas administrativas
router.get("/admin", auth, requireManagerOrAdmin, controller.getAll);
router.put("/admin/:id", auth, requireManagerOrAdmin, controller.adminUpdateUser);
router.patch("/admin/:id/approve", auth, requireManagerOrAdmin, controller.adminApproveUser);
router.delete("/admin/:id", auth, requireAdmin, controller.adminDeleteUser);

// Usuários disponíveis para atribuição em cards
router.get("/assignable", auth, controller.getAssignableUsers);

// Rotas protegidas
router.get("/:id", auth, controller.getUserProfile);
router.put("/:id", auth, controller.updateUserProfile);

module.exports = router;