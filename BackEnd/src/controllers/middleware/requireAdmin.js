const { User } = require("../../models");

module.exports = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const user = await User.findByPk(req.userId, {
      attributes: ["id", "perfil"],
    });

    if (!user) {
      return res.status(401).json({ message: "Usuário inválido" });
    }

    if (user.perfil !== "admin") {
      return res.status(403).json({ message: "Acesso restrito ao administrador" });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Erro ao validar perfil" });
  }
};
