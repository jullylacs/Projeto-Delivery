const express = require("express");
const router = express.Router();
const auth = require("../controllers/middleware/auth");
const { buscarProvedores } = require("../controllers/provedoresController");

router.post("/buscar", auth, buscarProvedores);

module.exports = router;
