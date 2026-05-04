const express = require("express");
const router = express.Router();
const controller = require("../controllers/muralController");
const auth = require("../controllers/middleware/auth");

// Lista todos os posts do mural
router.get("/", auth, controller.getPosts);
// Cria um novo post
router.post("/", auth, controller.createPost);
// Edita um post
router.put("/:id", auth, controller.updatePost);
// Remove um post
router.delete("/:id", auth, controller.deletePost);

module.exports = router;
