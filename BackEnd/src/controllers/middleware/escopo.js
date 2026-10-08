const { User } = require("../../models");

// Perfil que só enxerga o que ele mesmo criou, e o único board que ele usa.
const PERFIL_EXTERNO = "vendedor_externo";
const BOARD_EXTERNO = "externo";

// Middleware que carrega o escopo de visibilidade do usuário em req.escopo.
// Deve vir depois do `auth`. Revalida o perfil no banco — o token só carrega
// id/email, e um perfil trocado pelo admin precisa valer na hora.
const escopo = async (req, res, next) => {
  try {
    if (req.user?.isSystem) {
      req.escopo = { externo: false, userId: 0 };
      return next();
    }

    if (!req.userId) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    const user = await User.findByPk(req.userId, { attributes: ["id", "perfil", "aprovado"] });
    if (!user) {
      return res.status(401).json({ message: "Usuário inválido" });
    }

    // Desaprovar corta o acesso na hora, sem esperar o token expirar — é o
    // jeito de desligar um vendedor externo.
    if (!user.aprovado) {
      return res.status(403).json({ message: "Usuário não aprovado" });
    }

    req.escopo = { externo: user.perfil === PERFIL_EXTERNO, userId: user.id };
    return next();
  } catch (error) {
    return res.status(500).json({ message: "Erro ao validar perfil" });
  }
};

// Barra o vendedor externo em rotas que não fazem sentido para ele
// (gerenciar colunas, cadastrar técnico, ativações). Usar depois de `escopo`.
const bloqueiaExterno = (req, res, next) => {
  if (req.escopo?.externo) {
    return res.status(403).json({ message: "Sem permissão para esta ação." });
  }
  return next();
};

module.exports = escopo;
module.exports.bloqueiaExterno = bloqueiaExterno;
module.exports.PERFIL_EXTERNO = PERFIL_EXTERNO;
module.exports.BOARD_EXTERNO = BOARD_EXTERNO;
