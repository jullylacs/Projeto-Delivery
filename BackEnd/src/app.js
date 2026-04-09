const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { globalLimiter } = require("./middleware/rateLimiter");
const { sequelize } = require("./models");
const buildOpenApiSpec = require("./docs/openapi");

const app = express();
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || "5mb";
const apiBasePath = process.env.API_BASE_PATH || "/api/v1";
const legacyRoutesEnabled = String(process.env.ENABLE_LEGACY_ROUTES || "true").toLowerCase() === "true";

function normalizeOrigin(origin) {
  return String(origin || "").trim().replace(/\/$/, "").toLowerCase();
}

function getAllowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5173";
  return [...new Set(
    raw
      .split(",")
      .map((value) => normalizeOrigin(value))
      .filter(Boolean)
  )];
}

const allowedOrigins = getAllowedOrigins();

// 🔒 CORS Seguro - apenas frontend autorizado
const corsOptions = {
  origin(origin, callback) {
    // Permite ferramentas sem Origin (curl, health checks, server-to-server).
    if (!origin) {
      return callback(null, true);
    }

    const normalizedRequestOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalizedRequestOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// 🔒 Middlewares de Segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://unpkg.com"],
      connectSrc: ["'self'", "https://unpkg.com"],
    },
  },
}));
app.use(cors(corsOptions));
app.use(globalLimiter);
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ limit: requestBodyLimit, extended: true }));

const cardRoutes = require("./routes/cardRoutes");
const columnRoutes = require("./routes/columnRoutes");
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const technicianRoutes = require("./routes/technicianRoutes");
const auth = require("./controllers/middleware/auth");

// 🔹 Rotas versionadas da aplicação
app.get(`${apiBasePath}/`, (req, res) => {
  res.send("API Kanban rodando 🚀");
});

app.get(`${apiBasePath}/health/db`, async (req, res) => {
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

app.use(`${apiBasePath}/cards`, cardRoutes);
app.use(`${apiBasePath}/columns`, auth, columnRoutes);
app.use(`${apiBasePath}/users`, userRoutes);
app.use(`${apiBasePath}/notifications`, notificationRoutes);
app.use(`${apiBasePath}/schedules`, scheduleRoutes);
app.use(`${apiBasePath}/technicians`, technicianRoutes);

// OpenAPI + Swagger UI (sem dependência local)
app.get(`${apiBasePath}/openapi.json`, (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json(buildOpenApiSpec(req));
});

app.get(`${apiBasePath}/docs`, (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Delivery API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>body{margin:0;background:#f7f5ff;}#swagger-ui{max-width:1200px;margin:0 auto;}</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function() {
        try {
          window.ui = SwaggerUIBundle({
            url: '${apiBasePath}/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            layout: "StandaloneLayout",
            onComplete: function() {
              console.log('Swagger UI carregado com sucesso');
            },
            onFailure: function(err) {
              console.error('Erro ao carregar Swagger UI:', err);
            }
          });
        } catch (err) {
          console.error('Erro ao inicializar Swagger UI:', err);
          document.getElementById('swagger-ui').innerHTML = '<p>Erro ao carregar documentação. Verifique a console.</p>';
        }
      }
    </script>
  </body>
</html>`);
});

// Rotas legadas sem prefixo (compatibilidade temporária)
if (legacyRoutesEnabled) {
  app.use("/cards", cardRoutes);
  app.use("/columns", auth, columnRoutes);
  app.use("/users", userRoutes);
  app.use("/notifications", notificationRoutes);
  app.use("/schedules", scheduleRoutes);
  app.use("/technicians", technicianRoutes);
}

app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      message: "Arquivo muito grande. Tente uma imagem menor para o avatar.",
    });
  }

  return next(err);
});

module.exports = app;