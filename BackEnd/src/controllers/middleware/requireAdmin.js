const { User } = require("../../models");

// Middleware que verifica se o usuário autenticado possui perfil "admin"
// Deve ser usado após o middleware de autenticação (auth.js)
module.exports = async (req, res, next) => {
  try {
    // Se não há userId no request, o token não foi validado antes
    if (!req.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    // Busca o usuário no banco para verificar o perfil atual (não confia só no token)
    const user = await User.findByPk(req.userId, {
      attributes: ["id", "perfil"],
    });

    if (!user) {
      return res.status(401).json({ message: "Usuário inválido" });
    }

    // Bloqueia acesso caso o perfil não seja admin
    if (user.perfil !== "admin") {
      return res.status(403).json({ message: "Acesso restrito ao administrador" });
    }

    // Usuário validado como admin: prossegue para o próximo middleware/controller
    next();
  } catch (error) {
    return res.status(500).json({ message: "Erro ao validar perfil" });
  }
};
