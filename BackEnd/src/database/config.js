require("dotenv").config();

const dbDialect = process.env.DB_DIALECT || "postgres";
const dbSslEnabled = String(process.env.DB_SSL || "false").toLowerCase() === "true";
const dbSslRejectUnauthorized = String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "false").toLowerCase() === "true";

const baseConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  dialect: dbDialect,
  logging: false,
};

// 🔹 Configuração de conexão lida pelo sequelize-cli para rodar migrations
module.exports = {
  development: {
    ...baseConfig,
    ...(dbSslEnabled
      ? {
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: dbSslRejectUnauthorized,
            },
          },
        }
      : {}),
  },
  production: {
    ...baseConfig,
    ...(dbSslEnabled
      ? {
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: dbSslRejectUnauthorized,
            },
          },
        }
      : {
          dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          },
        }),
  }
};