const { Card, User } = require("../models"); // Importa o model de Card (Sequelize/PostgreSQL)
const fs = require("fs");
const path = require("path");

const devCardsStore = [];
const DEV_DATA_DIR = path.resolve(__dirname, "../../data");
const DEV_CARDS_FILE = path.join(DEV_DATA_DIR, "dev-cards.json");

const isDevMode = () => (process.env.NODE_ENV || "development") !== "production";

const isDbOfflineError = (err) => err?.parent?.code === "ECONNREFUSED" || err?.name === "SequelizeConnectionRefusedError";

const normalizeCard = (card) => {
  const raw = card?.toJSON ? card.toJSON() : { ...card };
  if (!raw) return raw;

  if (raw.id !== undefined && raw._id === undefined) {
    raw._id = String(raw.id);
  }

  return raw;
};

const loadDevCardsStore = () => {
  try {
    if (!fs.existsSync(DEV_CARDS_FILE)) return;
    const fileContent = fs.readFileSync(DEV_CARDS_FILE, "utf-8");
    const parsed = JSON.parse(fileContent);
    if (Array.isArray(parsed)) {
      devCardsStore.splice(0, devCardsStore.length, ...parsed);
    }
  } catch (error) {
    console.error("Falha ao carregar cards persistidos:", error.message);
  }
};

const persistDevCardsStore = () => {
  try {
    if (!fs.existsSync(DEV_DATA_DIR)) {
      fs.mkdirSync(DEV_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DEV_CARDS_FILE, JSON.stringify(devCardsStore, null, 2), "utf-8");
  } catch (error) {
    console.error("Falha ao persistir cards:", error.message);
  }
};

loadDevCardsStore();

// 🔹 Criação de um novo card
exports.createCard = async (req, res) => {
  try {
    // Cria um novo card com os dados enviados no body da requisição
    const card = await Card.create(req.body);

    // Retorna o card criado como resposta
    res.json(normalizeCard(card));
  } catch (err) {
    if (isDbOfflineError(err) && isDevMode()) {
      const now = new Date().toISOString();
      const card = {
        ...req.body,
        _id: `dev-${Date.now()}`,
        id: null,
        createdAt: now,
        updatedAt: now,
      };
      devCardsStore.unshift(card);
      persistDevCardsStore();
      return res.json(card);
    }

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
    if (isDbOfflineError(err) && isDevMode()) {
      return res.json(devCardsStore);
    }

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
    if (isDbOfflineError(err) && isDevMode()) {
      const targetId = req.params.id;
      const index = devCardsStore.findIndex((card) => card._id === targetId || String(card.id) === String(targetId));
      if (index === -1) {
        return res.status(404).json({ message: "Card não encontrado" });
      }

      devCardsStore[index] = {
        ...devCardsStore[index],
        ...req.body,
        _id: devCardsStore[index]._id,
        updatedAt: new Date().toISOString(),
      };
      persistDevCardsStore();
      return res.json(devCardsStore[index]);
    }

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
    if (isDbOfflineError(err) && isDevMode()) {
      const targetId = req.params.id;
      const index = devCardsStore.findIndex((card) => card._id === targetId || String(card.id) === String(targetId));
      if (index === -1) {
        return res.status(404).json({ message: "Card não encontrado" });
      }

      devCardsStore.splice(index, 1);
      persistDevCardsStore();
      return res.json({ message: "Deletado" });
    }

    // Em caso de erro (ex: falha no banco), retorna status 500
    res.status(500).json({ error: err?.message || err?.name || "Erro ao deletar card" });
  }
};