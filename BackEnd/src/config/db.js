const { Sequelize } = require("sequelize");

// 🔹 Instância Sequelize conectando ao PostgreSQL via variáveis de ambiente
const sequelize = new Sequelize(
  process.env.DB_NAME || "delivery_sys",  // Nome do banco
  process.env.DB_USER || "postgres",      // Usuário
  process.env.DB_PASS || "postgres",      // Senha
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false, // Desativa logs SQL no console (mude para console.log para debug)
    pool: {
      max: 10,      // Máximo de conexões simultâneas
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;