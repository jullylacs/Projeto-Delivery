const router = require("express").Router();
const controller = require("../controllers/cardController");

router.post("/", controller.createCard);
router.get("/", controller.getCards);
router.put("/:id", controller.updateCard);
router.delete("/:id", controller.deleteCard);

module.exports = router;