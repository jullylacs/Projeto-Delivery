const jwt = require("jsonwebtoken"); // Importa a biblioteca para trabalhar com tokens JWT

module.exports = (req, res, next) => {
  // Pega o token enviado no header da requisição (Authorization)
  const token = req.headers.authorization;

  // Verifica se o token não foi enviado
  if (!token) {
    // Retorna erro 401 (não autorizado) caso não exista token
    return res.status(401).json({ message: "Sem token" });
  }

  try {
    // Verifica e decodifica o token usando a chave secreta ("segredo")
    const decoded = jwt.verify(token, "segredo");

    // Adiciona o ID do usuário decodificado na requisição
    // Isso permite usar o ID em rotas protegidas posteriormente
    req.userId = decoded.id;

    // Chama o próximo middleware ou rota
    next();
  } catch {
    // Caso o token seja inválido, expirado ou adulterado
    // retorna erro 401 (não autorizado)
    res.status(401).json({ message: "Token inválido" });
  }
};