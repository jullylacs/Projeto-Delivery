const { User } = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const xss = require("xss");
const { Op } = require("sequelize");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isBcryptHash = (value) => typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
const allowedPerfis = ["comercial", "operacional", "tecnico", "gestor", "admin"];

exports.register = async (req, res) => {
  try {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "Nome, email e senha obrigatórios" });
    }

    if (senha.length < 8) {
      return res.status(400).json({ message: "Senha deve ter no minimo 8 caracteres", error: "Senha deve ter no minimo 8 caracteres" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Email invalido", error: "Email invalido" });
    }

    if (perfil && !allowedPerfis.includes(perfil)) {
      return res.status(400).json({ message: "Perfil invalido", error: "Perfil invalido" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email ja cadastrado", error: "Email ja cadastrado" });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const userData = {
      nome: xss(nome),
      email: email.toLowerCase(),
      senha: senhaHash,
      perfil: xss(perfil || "comercial")
    };

    const user = await User.create(userData);
    const userResponse = user.toJSON();
    delete userResponse.senha;

    res.status(201).json(userResponse);
  } catch (err) {
    console.error("Erro no registro:", err);
    res.status(500).json({ message: "Erro ao registrar", error: "Erro ao registrar" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ message: "Email e senha obrigatórios" });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    let isPasswordValid = false;

    if (isBcryptHash(user.senha)) {
      isPasswordValid = await bcrypt.compare(senha, user.senha);
    } else {
      // Compatibilidade com contas antigas em texto puro.
      isPasswordValid = senha === user.senha;

      if (isPasswordValid) {
        const newHash = await bcrypt.hash(senha, 12);
        await User.update({ senha: newHash }, { where: { id: user.id } });
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET não configurado");
      return res.status(500).json({ message: "Erro no servidor" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      jwtSecret,
      { expiresIn: "24h" }
    );

    const userObj = user.toJSON();
    delete userObj.senha;

    res.json({ user: userObj, token, expiresIn: 86400 });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.userId;

    if (!userId) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["senha"] }
    });

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json(user);
  } catch (err) {
    console.error("Erro ao buscar perfil:", err);
    res.status(500).json({ message: "Erro ao buscar perfil" });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (req.userId !== parseInt(userId)) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const { nome, email, perfil, telefone, departamento, avatar } = req.body;

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ message: "Email inválido" });
    }

    if (perfil && !allowedPerfis.includes(perfil)) {
      return res.status(400).json({ message: "Perfil inválido" });
    }

    const updateData = {
      nome: nome ? xss(nome) : undefined,
      email: email ? email.toLowerCase() : undefined,
      perfil: perfil ? xss(perfil) : undefined,
      telefone: telefone ? xss(telefone) : undefined,
      departamento: departamento ? xss(departamento) : undefined,
      avatar: avatar ? xss(avatar) : undefined
    };

    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    await User.update(updateData, { where: { id: userId } });

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ["senha"] }
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error("Erro ao atualizar:", err);
    res.status(500).json({ message: "Erro ao atualizar" });
  }
};

exports.getAll = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
    const limitRaw = Number.parseInt(req.query.limit || "10", 10);
    const limit = Number.isNaN(limitRaw) ? 10 : Math.min(Math.max(limitRaw, 1), 100);

    const allowedSortBy = ["id", "nome", "email", "perfil", "createdAt"];
    const sortBy = allowedSortBy.includes(req.query.sortBy) ? req.query.sortBy : "id";
    const sortOrder = String(req.query.sortOrder || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";

    const where = q
      ? {
          [Op.or]: [
            { nome: { [Op.iLike]: `%${q}%` } },
            { email: { [Op.iLike]: `%${q}%` } },
          ],
        }
      : undefined;

    const offset = (page - 1) * limit;

    const result = await User.findAndCountAll({
      where,
      attributes: { exclude: ["senha"] },
      order: [[sortBy, sortOrder]],
      offset,
      limit,
    });

    const total = result.count;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: { q },
      sorting: { sortBy, sortOrder: sortOrder.toLowerCase() },
    });
  } catch (err) {
    console.error("Erro ao listar:", err);
    return res.status(500).json({ error: "Erro ao listar usuários" });
  }
};

exports.adminUpdateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { nome, email, perfil, telefone, departamento, avatar } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ message: "Email inválido" });
    }

    if (perfil && !allowedPerfis.includes(perfil)) {
      return res.status(400).json({ message: "Perfil inválido" });
    }

    const updateData = {
      nome: nome ? xss(nome) : undefined,
      email: email ? email.toLowerCase() : undefined,
      perfil: perfil ? xss(perfil) : undefined,
      telefone: telefone ? xss(telefone) : undefined,
      departamento: departamento ? xss(departamento) : undefined,
      avatar: avatar !== undefined ? xss(avatar) : undefined,
    };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    await User.update(updateData, { where: { id: userId } });

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ["senha"] },
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.json(updatedUser);
  } catch (err) {
    console.error("Erro ao atualizar usuário (admin):", err);
    return res.status(500).json({ message: "Erro ao atualizar usuário" });
  }
};

exports.adminDeleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (Number(req.userId) === Number(userId)) {
      return res.status(400).json({ message: "Você não pode excluir o próprio usuário" });
    }

    const deletedRows = await User.destroy({ where: { id: userId } });

    if (!deletedRows) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.status(204).send();
  } catch (err) {
    console.error("Erro ao excluir usuário (admin):", err);
    return res.status(500).json({ message: "Erro ao excluir usuário" });
  }
};