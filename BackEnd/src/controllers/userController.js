const { User } = require("../models"); // Importa model via index centralizado
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const DEV_DATA_DIR = path.resolve(__dirname, "../../data");
const DEV_USERS_FILE = path.join(DEV_DATA_DIR, "dev-users.json");

const readDevUsers = () => {
  try {
    if (!fs.existsSync(DEV_USERS_FILE)) return [];
    const raw = fs.readFileSync(DEV_USERS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeDevUsers = (users) => {
  try {
    if (!fs.existsSync(DEV_DATA_DIR)) {
      fs.mkdirSync(DEV_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DEV_USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch {
    // Ignora erro de persistência em fallback local
  }
};

const upsertDevUser = (userInput = {}) => {
  const users = readDevUsers();
  const id = String(userInput.id || "dev-local");
  const email = String(userInput.email || "").toLowerCase();

  const index = users.findIndex(
    (u) => String(u.id) === id || (email && String(u.email || "").toLowerCase() === email)
  );

  const base = {
    id,
    nome: "Usuário Local",
    email: "usuario@local.dev",
    perfil: "comercial",
    telefone: "",
    departamento: "",
    avatar: "",
  };

  const merged = {
    ...(index >= 0 ? users[index] : base),
    ...userInput,
    id,
    email: userInput.email || (index >= 0 ? users[index].email : base.email),
  };

  if (index >= 0) {
    users[index] = merged;
  } else {
    users.push(merged);
  }

  writeDevUsers(users);
  return merged;
};

const getDevUser = ({ id, email }) => {
  const users = readDevUsers();
  const idString = id ? String(id) : "";
  const emailString = email ? String(email).toLowerCase() : "";

  return (
    users.find(
      (u) =>
        (idString && String(u.id) === idString) ||
        (emailString && String(u.email || "").toLowerCase() === emailString)
    ) || null
  );
};

// 🔹 Registro de novo usuário
exports.register = async (req, res) => {
  try {
    const user = await User.create(req.body);

    // Remove senha da resposta sem alterar o registro
    const userResponse = user.toJSON();
    delete userResponse.senha;

    res.json(userResponse);
  } catch (err) {
    const fallbackError = err?.parent?.code || err?.name || "Erro interno no registro";
    res.status(500).json({ error: err?.message || fallbackError });
  }
};

// 🔹 Login do usuário
exports.login = async (req, res) => {
  try {
    if (!req.body?.email || !req.body?.senha) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }

    // Busca usuário pelo email (equivalente ao findOne({ email }) do Mongoose)
    const user = await User.findOne({ where: { email: req.body.email } });

    // Verifica existência e senha
    if (!user || user.senha !== req.body.senha) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    // Gera token JWT com o ID do usuário (user.id no Sequelize, era user._id no Mongoose)
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "segredo");

    const perfil = req.body.perfil || user.perfil || "comercial";

    // Converte para objeto puro (equivalente ao .toObject() do Mongoose)
    const userObj = user.toJSON();
    delete userObj.senha;

    const userResponse = { ...userObj, perfil };

    res.json({ user: userResponse, token });
  } catch (err) {
    const isDbOffline = err?.parent?.code === "ECONNREFUSED" || err?.name === "SequelizeConnectionRefusedError";
    const isDevMode = (process.env.NODE_ENV || "development") !== "production";

    // Fallback apenas para desenvolvimento local quando o banco estiver fora
    if (isDbOffline && isDevMode) {
      const perfil = req.body.perfil || "comercial";
      const existingDevUser = getDevUser({ email: req.body.email });
      const devUser = upsertDevUser({
        id: "dev-local",
        nome: existingDevUser?.nome || req.body.email.split("@")[0] || "Usuário Local",
        email: req.body.email,
        perfil,
        telefone: existingDevUser?.telefone || "",
        departamento: existingDevUser?.departamento || "",
        avatar: existingDevUser?.avatar || "",
      });
      const token = jwt.sign({ id: devUser.id, dev: true }, process.env.JWT_SECRET || "segredo");
      return res.json({ user: devUser, token, warning: "Login em modo desenvolvimento (sem banco)" });
    }

    const fallbackError = err?.parent?.code || err?.name || "Erro interno no login";
    res.status(500).json({ error: err?.message || fallbackError });
  }
};

// 🔹 Buscar perfil de um usuário
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.user?.id;

    // findByPk = equivalente ao findById do Mongoose
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["senha"] } // Equivalente ao .select("-senha") do Mongoose
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json(user);
  } catch (err) {
    const isDbOffline = err?.parent?.code === "ECONNREFUSED" || err?.name === "SequelizeConnectionRefusedError";
    const isDevMode = (process.env.NODE_ENV || "development") !== "production";

    if (isDbOffline && isDevMode) {
      const userId = req.params.id || "dev-local";
      const existingDevUser = getDevUser({ id: userId });
      return res.json(
        existingDevUser || {
        id: userId,
        nome: "Usuário Local",
        email: "usuario@local.dev",
        perfil: "comercial",
        telefone: "",
        departamento: "",
        avatar: "",
        }
      );
    }

    res.status(500).json({ message: "Erro ao buscar perfil", error: err.message });
  }
};

// 🔹 Atualizar perfil do usuário
exports.updateUserProfile = async (req, res) => {
  try {
    const { nome, email, perfil, telefone, departamento, avatar } = req.body;
    const userId = req.params.id;

    const updateData = { nome, email, perfil, telefone, departamento };
    if (avatar !== undefined) updateData.avatar = avatar;

    // Atualiza o usuário no banco
    await User.update(updateData, { where: { id: userId } });

    // Busca usuário atualizado sem a senha
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ["senha"] }
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json(updatedUser);
  } catch (err) {
    const isDbOffline = err?.parent?.code === "ECONNREFUSED" || err?.name === "SequelizeConnectionRefusedError";
    const isDevMode = (process.env.NODE_ENV || "development") !== "production";

    if (isDbOffline && isDevMode) {
      const userId = req.params.id || "dev-local";
      const { nome, email, perfil, telefone, departamento, avatar } = req.body || {};
      const updatedDevUser = upsertDevUser({
        id: userId,
        nome: nome || "Usuário Local",
        email: email || "usuario@local.dev",
        perfil: perfil || "comercial",
        telefone: telefone || "",
        departamento: departamento || "",
        avatar: avatar || "",
      });
      return res.json(updatedDevUser);
    }

    res.status(500).json({ message: "Erro ao atualizar perfil", error: err.message });
  }
};

// 🔹 Listar todos os usuários
exports.getAll = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["senha"] } // Nunca expõe senhas na listagem
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};