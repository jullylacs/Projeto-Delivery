require("dotenv").config();

const app = require("./src/app"); // Importa a aplicação Express
const http = require("http");     // Core do Node para criar servidor HTTP
const { Server } = require("socket.io"); // Importa Socket.IO para tempo real

// 🔹 Cria servidor HTTP usando Express
const server = http.createServer(app);

// 🔹 Inicializa Socket.IO
const io = new Server(server, {
  cors: { origin: "*" } // Permite qualquer front-end acessar o WebSocket
});

// 🔹 Evento de conexão do cliente
io.on("connection", (socket) => {
  console.log("Cliente conectado");

  // Aqui você pode adicionar eventos:
  // ex: socket.on("novoCard", data => { ... })
});

// 🔹 Inicia o servidor na porta configurada
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";
server.listen(PORT, HOST, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});