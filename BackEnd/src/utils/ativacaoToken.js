const crypto = require("crypto");

// Gera o token público usado no link único enviado ao técnico.
// 24 bytes aleatórios (48 chars hex) — inviável de adivinhar/força-bruta.
function gerarPublicToken() {
  return crypto.randomBytes(24).toString("hex");
}

module.exports = { gerarPublicToken };
