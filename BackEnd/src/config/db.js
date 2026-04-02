const { Sequelize } = require("sequelize");

const dbDialect = process.env.DB_DIALECT || "postgres";
const dbSslEnabled = String(process.env.DB_SSL || "false").toLowerCase() === "true";
const dbSslRejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true";

const sequelizeOptions = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  dialect: dbDialect,
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

if (dbSslEnabled) {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: dbSslRejectUnauthorized,
    },
  };
}

// 🔹 Instância Sequelize conectando ao PostgreSQL via variáveis de ambiente
const sequelize = new Sequelize(
  process.env.DB_NAME || "delivery_sys",  // Nome do banco
  process.env.DB_USER || "postgres",      // Usuário
  process.env.DB_PASS || "postgres",      // Senha
  sequelizeOptions
);

module.exports = sequelize;