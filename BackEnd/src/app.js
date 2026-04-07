const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { globalLimiter } = require("./middleware/rateLimiter");
const { sequelize } = require("./models");

const app = express();
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || "5mb";

// 🔒 CORS Seguro - apenas frontend autorizado
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// 🔒 Middlewares de Segurança
app.use(helmet());
app.use(cors(corsOptions));
app.use(globalLimiter);
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ limit: requestBodyLimit, extended: true }));

// 🔹 Rota base para teste rápido
app.get("/", (req, res) => {
  res.send("API Kanban rodando 🚀");
});

app.get("/health/db", async (req, res) => {
  try {
    await sequelize.authenticate();
    return res.status(200).json({ status: "ok", database: "connected" });
  } catch (error) {
    return res.status(503).json({
      status: "error",
      database: "disconnected",
      message: error.message,
    });
  }
});

// 🔹 Rotas da aplicação
app.use("/cards",       require("./routes/cardRoutes"));
app.use("/users",       require("./routes/userRoutes"));
app.use("/schedules",   require("./routes/scheduleRoutes"));
app.use("/technicians", require("./routes/technicianRoutes"));

app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      message: "Arquivo muito grande. Tente uma imagem menor para o avatar.",
    });
  }

  return next(err);
});

module.exports = app;