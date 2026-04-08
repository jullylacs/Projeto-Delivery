const { randomUUID } = require("crypto");
const { User, RefreshToken } = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const xss = require("xss");
const { Op } = require("sequelize");

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "24h";
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

const getJwtSecrets = () => {
  const accessSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return { accessSecret, refreshSecret };
};

const buildAccessTokenPayload = (user) => ({ id: user.id, email: user.email });

const issueTokenPair = async (user) => {
  const { accessSecret, refreshSecret } = getJwtSecrets();
  if (!accessSecret || !refreshSecret) {
    throw new Error("JWT secrets não configurados");
  }

  const accessToken = jwt.sign(
    buildAccessTokenPayload(user),
    accessSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

  const jti = randomUUID();
  const refreshToken = jwt.sign(
    { ...buildAccessTokenPayload(user), type: "refresh", jti },
    refreshSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  const decodedRefresh = jwt.decode(refreshToken);
  const expiresAt = decodedRefresh?.exp ? new Date(decodedRefresh.exp * 1000) : null;

  await RefreshToken.create({
    usuario_id: user.id,
    token: jti,
    expiraEm: expiresAt,
    revogadoEm: null,
  });

  return {
    token: accessToken,
    refreshToken,
    expiresIn: decodedRefresh?.exp && decodedRefresh?.iat ? decodedRefresh.exp - decodedRefresh.iat : 0,
  };
};

const resolveRefreshTokenInput = (req) => {
  const bodyToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken.trim() : "";
  if (bodyToken) return bodyToken;

  const headerToken = typeof req.headers["x-refresh-token"] === "string"
    ? req.headers["x-refresh-token"].trim()
    : "";
  if (headerToken) return headerToken;

  return "";
};

// Valida formato de e-mail
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// Detecta se a senha já é um hash bcrypt (evita re-hash acidental)
const isBcryptHash = (value) => typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
// Perfis válidos aceitos pelo sistema
const allowedPerfis = ["convidado", "comercial", "operacional", "tecnico", "delivery", "gestor", "admin"];
// Aceita avatar como data URL de imagem ou URL http/https
const sanitizeAvatar = (value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return "";

  const isDataImage = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(trimmed);
  const isHttpUrl = /^https?:\/\/[^\s]+$/i.test(trimmed);

  if (!isDataImage && !isHttpUrl) {
    return undefined;
  }

  return trimmed;
};

// 🔹 Registro de novo usuário
exports.register = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "Nome, email e senha obrigatórios" });
    }

    if (senha.length < 8) {
      return res.status(400).json({ message: "Senha deve ter no minimo 8 caracteres", error: "Senha deve ter no minimo 8 caracteres" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Email invalido", error: "Email invalido" });
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
      perfil: "convidado",
      aprovado: false,
      aprovado_por: null,
      aprovado_em: null,
    };

    const user = await User.create(userData);
    const userResponse = user.toJSON();
    delete userResponse.senha;

    res.status(201).json({
      ...userResponse,
      message: "Cadastro enviado para aprovação. Aguarde liberação de Admin ou Gestor.",
    });
  } catch (err) {
    console.error("Erro no registro:", err);
    res.status(500).json({ message: "Erro ao registrar", error: "Erro ao registrar" });
  }
};

// 🔹 Autenticação: valida email/senha e gera token JWT
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

    if (!user.aprovado) {
      return res.status(403).json({
        message: "Seu cadastro ainda não foi aprovado por Admin/Gestor.",
      });
    }

    const { accessSecret, refreshSecret } = getJwtSecrets();
    if (!accessSecret || !refreshSecret) {
      console.error("JWT_SECRET não configurado");
      return res.status(500).json({ message: "Erro no servidor" });
    }

    const tokenPair = await issueTokenPair(user);

    const userObj = user.toJSON();
    delete userObj.senha;

    res.json({
      user: userObj,
      token: tokenPair.token,
      refreshToken: tokenPair.refreshToken,
      expiresIn: 86400,
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
};

exports.refresh = async (req, res) => {
  try {
    const refreshToken = resolveRefreshTokenInput(req);
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token não fornecido" });
    }

    const { refreshSecret } = getJwtSecrets();
    if (!refreshSecret) {
      return res.status(500).json({ message: "Erro no servidor" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret);
    } catch (error) {
      return res.status(401).json({ message: "Refresh token inválido ou expirado" });
    }

    if (decoded?.type !== "refresh" || !decoded?.jti || !decoded?.id) {
      return res.status(401).json({ message: "Refresh token inválido" });
    }

    const storedToken = await RefreshToken.findOne({
      where: {
        usuario_id: Number(decoded.id),
        token: String(decoded.jti),
        revogadoEm: { [Op.is]: null },
      },
    });

    if (!storedToken) {
      return res.status(401).json({ message: "Refresh token revogado" });
    }

    if (storedToken.expiraEm && new Date(storedToken.expiraEm).getTime() < Date.now()) {
      await storedToken.update({ revogadoEm: new Date() });
      return res.status(401).json({ message: "Refresh token expirado" });
    }

    const user = await User.findByPk(Number(decoded.id));
    if (!user || !user.aprovado) {
      return res.status(401).json({ message: "Usuário inválido" });
    }

    await storedToken.update({ revogadoEm: new Date() });

    const tokenPair = await issueTokenPair(user);

    return res.json({
      token: tokenPair.token,
      refreshToken: tokenPair.refreshToken,
      expiresIn: 86400,
    });
  } catch (err) {
    console.error("Erro ao renovar token:", err);
    return res.status(500).json({ message: "Erro ao renovar token" });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = resolveRefreshTokenInput(req);

    if (refreshToken) {
      const { refreshSecret } = getJwtSecrets();
      if (!refreshSecret) {
        return res.status(500).json({ message: "Erro no servidor" });
      }

      try {
        const decoded = jwt.verify(refreshToken, refreshSecret);
        if (decoded?.jti && decoded?.id) {
          await RefreshToken.update(
            { revogadoEm: new Date() },
            {
              where: {
                usuario_id: Number(decoded.id),
                token: String(decoded.jti),
                revogadoEm: { [Op.is]: null },
              },
            }
          );
        }
      } catch {
        // Mesmo com token inválido, logout responde sucesso para evitar leak de estado.
      }

      return res.status(204).send();
    }

    if (Number.isFinite(Number(req.userId)) && Number(req.userId) > 0) {
      await RefreshToken.update(
        { revogadoEm: new Date() },
        {
          where: {
            usuario_id: Number(req.userId),
            revogadoEm: { [Op.is]: null },
          },
        }
      );
    }

    return res.status(204).send();
  } catch (err) {
    console.error("Erro no logout:", err);
    return res.status(500).json({ message: "Erro ao realizar logout" });
  }
};

// 🔹 Busca o perfil de um usuário por ID (usado na página de perfil)
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.userId;

    if (!userId) {
      return res.status(400).json({ message: "ID inválido" });
    }

    // Busca excluindo a senha do retorno
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

// 🔹 Atualiza dados do próprio perfil (apenas o próprio usuário pode editar)
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (req.userId !== parseInt(userId)) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const { nome, email, telefone, departamento, avatar } = req.body;

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ message: "Email inválido" });
    }

    const safeAvatar = sanitizeAvatar(avatar);
    if (avatar !== undefined && safeAvatar === undefined) {
      return res.status(400).json({ message: "Avatar inválido" });
    }

    const updateData = {
      nome: nome ? xss(nome) : undefined,
      email: email ? email.toLowerCase() : undefined,
      telefone: telefone ? xss(telefone) : undefined,
      departamento: departamento ? xss(departamento) : undefined,
      avatar: safeAvatar
    };

    // Remove campos undefined antes de enviar ao banco (Sequelize ignora undefined com update)
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    await User.update(updateData, { where: { id: userId } });

    // Retorna o usuário atualizado sem a senha
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

// 🔹 Lista todos os usuários com paginação, busca e ordenação (admin only)
exports.getAll = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
    const limitRaw = Number.parseInt(req.query.limit || "10", 10);
    const limit = Number.isNaN(limitRaw) ? 10 : Math.min(Math.max(limitRaw, 1), 100);

    const allowedSortBy = ["id", "nome", "email", "perfil", "aprovado", "createdAt"];
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

// 🔹 Atualiza qualquer usuário pelo ID (rota exclusiva para admin)
exports.adminUpdateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { nome, email, perfil, telefone, departamento, avatar, aprovado } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "ID inválido" });
    }

    if (email && !isValidEmail(email)) {
      return res.status(400).json({ message: "Email inválido" });
    }

    if (perfil && !allowedPerfis.includes(perfil)) {
      return res.status(400).json({ message: "Perfil inválido" });
    }

    const safeAvatar = sanitizeAvatar(avatar);
    if (avatar !== undefined && safeAvatar === undefined) {
      return res.status(400).json({ message: "Avatar inválido" });
    }

    const updateData = {
      nome: nome ? xss(nome) : undefined,
      email: email ? email.toLowerCase() : undefined,
      perfil: perfil ? xss(perfil) : undefined,
      telefone: telefone ? xss(telefone) : undefined,
      departamento: departamento ? xss(departamento) : undefined,
      avatar: safeAvatar,
    };

    if (aprovado !== undefined) {
      if (typeof aprovado !== "boolean") {
        return res.status(400).json({ message: "Campo 'aprovado' inválido" });
      }

      updateData.aprovado = aprovado;
      if (aprovado) {
        updateData.aprovado_por = Number(req.userId);
        updateData.aprovado_em = new Date();
      } else {
        updateData.aprovado_por = null;
        updateData.aprovado_em = null;
      }
    }

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

// 🔹 Exclui um usuário pelo ID (rota exclusiva para admin, não pode excluir a si mesmo)
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

// 🔹 Aprova um usuário pendente (admin/gestor)
exports.adminApproveUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const targetUser = await User.findByPk(userId, {
      attributes: ["id", "aprovado"],
    });

    if (!targetUser) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (targetUser.aprovado) {
      return res.status(400).json({ message: "Usuário já está aprovado" });
    }

    await User.update(
      {
        aprovado: true,
        aprovado_por: Number(req.userId),
        aprovado_em: new Date(),
      },
      { where: { id: userId } }
    );

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ["senha"] },
    });

    return res.json(updatedUser);
  } catch (err) {
    console.error("Erro ao aprovar usuário:", err);
    return res.status(500).json({ message: "Erro ao aprovar usuário" });
  }
};

// 🔹 Lista simplificada de usuários para atribuição de vendedor (qualquer usuário autenticado)
exports.getAssignableUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        aprovado: true,
        perfil: {
          [Op.ne]: "convidado",
        },
      },
      attributes: ["id", "nome", "email", "perfil", "avatar"],
      order: [["nome", "ASC"], ["id", "ASC"]],
    });

    return res.json(users);
  } catch (err) {
    console.error("Erro ao listar usuários atribuíveis:", err);
    return res.status(500).json({ message: "Erro ao listar usuários" });
  }
};