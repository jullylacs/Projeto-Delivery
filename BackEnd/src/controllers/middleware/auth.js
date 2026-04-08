const jwt = require("jsonwebtoken");

// Middleware de autenticação JWT
// Valida o token Bearer enviado no header Authorization e injeta req.userId e req.user
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Rejeita requisições sem header de autorização
  if (!authHeader) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  // Aceita tanto "Bearer <token>" quanto o token direto
  const token = authHeader.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : authHeader;

  const systemToken = process.env.SYSTEM_API_TOKEN;
  if (systemToken && token === systemToken) {
    req.userId = 0;
    req.user = { id: 0, email: "system@local", isSystem: true };
    return next();
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET não configurado");
    return res.status(500).json({ message: "Erro no servidor" });
  }

  try {
    // Verifica e decodifica o token usando a chave secreta
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.id;   // ID do usuário disponível para os controllers
    req.user = decoded;         // Payload completo do token
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado" });
    }
    return res.status(401).json({ message: "Token inválido" });
  }
};