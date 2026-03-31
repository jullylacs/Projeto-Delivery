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
    // Verifica e decodifica — usa variável de ambiente ou fallback
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "segredo");
 
    // Agora decoded.id é um integer (PK do PostgreSQL), não mais ObjectId do MongoDB
    req.userId = decoded.id;

    // Chama o próximo middleware ou rota
    next();
  } catch {
    // Caso o token seja inválido, expirado ou adulterado
    // retorna erro 401 (não autorizado)
    res.status(401).json({ message: "Token inválido" });
  }
};