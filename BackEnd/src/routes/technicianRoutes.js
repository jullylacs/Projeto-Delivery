const router = require("express").Router();
const Technician = require("../models/Technician");

router.post("/", async (req, res) => {
  const tech = await Technician.create(req.body);
  res.json(tech);
});

router.get("/", async (req, res) => {
  const techs = await Technician.find();
  res.json(techs);
});

module.exports = router;