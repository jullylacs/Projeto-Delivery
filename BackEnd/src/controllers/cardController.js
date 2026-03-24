const Card = require("../models/Card"); // Importa o model de Card (MongoDB/Mongoose)

// 🔹 Criação de um novo card
exports.createCard = async (req, res) => {
  try {
    // Cria um novo card com os dados enviados no body da requisição
    const card = await Card.create(req.body);

    // Retorna o card criado como resposta
    res.json(card);
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json(err);
  }
};

// 🔹 Listagem de todos os cards
exports.getCards = async (req, res) => {
  // Busca todos os cards no banco
  // populate("vendedor") substitui o ID do vendedor pelos dados completos do usuário
  const cards = await Card.find().populate("vendedor");

  // Retorna a lista de cards
  res.json(cards);
};

// 🔹 Atualização de um card existente
exports.updateCard = async (req, res) => {
  // Busca o card pelo ID (req.params.id) e atualiza com os dados do body
  // { new: true } faz com que retorne o documento já atualizado
  const card = await Card.findByIdAndUpdate(req.params.id, req.body, { new: true });

  // Retorna o card atualizado
  res.json(card);
};

// 🔹 Exclusão de um card
exports.deleteCard = async (req, res) => {
  // Remove o card do banco pelo ID informado
  await Card.findByIdAndDelete(req.params.id);

  // Retorna mensagem de confirmação
  res.json({ message: "Deletado" });
};