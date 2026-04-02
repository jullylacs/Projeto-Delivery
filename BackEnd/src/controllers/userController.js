const { User } = require("../models"); // Importa model via index centralizado
const jwt = require("jsonwebtoken");

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