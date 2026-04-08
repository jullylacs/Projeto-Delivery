const { User } = require("../../models");

// Middleware que permite acesso apenas para perfis admin ou gestor.
module.exports = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const user = await User.findByPk(req.userId, {
      attributes: ["id", "perfil", "aprovado"],
    });

    if (!user) {
      return res.status(401).json({ message: "Usuário inválido" });
    }

    if (!user.aprovado) {
      return res.status(403).json({ message: "Usuário não aprovado" });
    }

    if (!["admin", "gestor"].includes(user.perfil)) {
      return res.status(403).json({ message: "Acesso restrito a Admin/Gestor" });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Erro ao validar perfil" });
  }
};