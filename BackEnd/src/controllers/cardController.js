const { Card, User } = require("../models"); // Importa o model de Card (Sequelize/PostgreSQL)

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
  try {
    // Busca todos os cards no banco
    // include: [{ model: User }] substitui o populate("vendedor") do Mongoose —
    // traz os dados completos do usuário vinculado ao card
    const cards = await Card.findAll({
      include: [{ model: User, as: "vendedor", attributes: { exclude: ["senha"] } }]
    });

    // Retorna a lista de cards
    res.json(cards);
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json(err);
  }
};

// 🔹 Atualização de um card existente
exports.updateCard = async (req, res) => {
  try {
    // Atualiza o card com os dados do body filtrando pelo ID
    // Equivalente ao findByIdAndUpdate do Mongoose
    await Card.update(req.body, { where: { id: req.params.id } });

    // Busca o card já atualizado para retornar ao cliente
    // Equivalente ao { new: true } do Mongoose — que retornava o documento atualizado
    const card = await Card.findByPk(req.params.id, {
      include: [{ model: User, as: "vendedor", attributes: { exclude: ["senha"] } }]
    });

    // Retorna o card atualizado
    res.json(card);
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json(err);
  }
};

// 🔹 Exclusão de um card
exports.deleteCard = async (req, res) => {
  try {
    // Remove o card do banco pelo ID informado
    // Equivalente ao findByIdAndDelete do Mongoose
    await Card.destroy({ where: { id: req.params.id } });

    // Retorna mensagem de confirmação
    res.json({ message: "Deletado" });
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json(err);
  }
};