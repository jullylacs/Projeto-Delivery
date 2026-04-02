const { Card, User } = require("../models"); // Importa o model de Card (Sequelize/PostgreSQL)

const normalizeCard = (card) => {
  const raw = card?.toJSON ? card.toJSON() : { ...card };
  if (!raw) return raw;

  if (raw.id !== undefined && raw._id === undefined) {
    raw._id = String(raw.id);
  }

  return raw;
};

// 🔹 Criação de um novo card
exports.createCard = async (req, res) => {
  try {
    // Cria um novo card com os dados enviados no body da requisição
    const card = await Card.create(req.body);

    // Retorna o card criado como resposta
    res.json(normalizeCard(card));
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json({ error: err?.message || err?.name || "Erro ao criar card" });
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
    res.json(cards.map(normalizeCard));
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json({ error: err?.message || err?.name || "Erro ao listar cards" });
  }
};

// 🔹 Atualização de um card existente
exports.updateCard = async (req, res) => {
  try {
    const targetId = req.params.id;

    // Atualiza o card com os dados do body filtrando pelo ID
    // Equivalente ao findByIdAndUpdate do Mongoose
    await Card.update(req.body, { where: { id: targetId } });

    // Busca o card já atualizado para retornar ao cliente
    // Equivalente ao { new: true } do Mongoose — que retornava o documento atualizado
    const card = await Card.findByPk(targetId, {
      include: [{ model: User, as: "vendedor", attributes: { exclude: ["senha"] } }]
    });

    // Retorna o card atualizado
    res.json(normalizeCard(card));
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json({ error: err?.message || err?.name || "Erro ao atualizar card" });
  }
};

// 🔹 Exclusão de um card
exports.deleteCard = async (req, res) => {
  try {
    const targetId = req.params.id;

    // Remove o card do banco pelo ID informado
    // Equivalente ao findByIdAndDelete do Mongoose
    await Card.destroy({ where: { id: targetId } });

    // Retorna mensagem de confirmação
    res.json({ message: "Deletado" });
  } catch (err) {
    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json({ error: err?.message || err?.name || "Erro ao deletar card" });
  }
};