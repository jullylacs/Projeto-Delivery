require("dotenv").config();

const app = require("./src/app");
const http = require("http");
const { Server } = require("socket.io");
const { sequelize } = require("./src/models");

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

// Cria servidor HTTP usando Express
const server = http.createServer(app);

// 🔒 Configuração segura de Socket.IO
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedRequestOrigin = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalizedRequestOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

// Middleware de autenticação para Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Autenticação necessária"));
  }
  next();
});

// Evento de conexão do cliente
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// Inicia o servidor apenas se o banco estiver conectado
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Banco de dados conectado com sucesso.");

    server.listen(PORT, HOST, () => {
      console.log(`Servidor rodando em http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error("Falha ao conectar no banco de dados:", error.message);
    process.exit(1);
  }
}

startServer();