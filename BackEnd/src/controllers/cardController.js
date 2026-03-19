const Card = require("../models/Card");

exports.createCard = async (req, res) => {
  try {
    const card = await Card.create(req.body);
    res.json(card);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.getCards = async (req, res) => {
  const cards = await Card.find().populate("vendedor");
  res.json(cards);
};

exports.updateCard = async (req, res) => {
  const card = await Card.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(card);
};

exports.deleteCard = async (req, res) => {
  await Card.findByIdAndDelete(req.params.id);
  res.json({ message: "Deletado" });
};