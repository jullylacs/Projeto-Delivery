const express = require("express"); // Importa o Express, framework web
const cors = require("cors");       // Permite requisições cross-origin

const app = express();               // Cria a aplicação Express

// 🔹 Middlewares globais
app.use(cors());                     // Habilita CORS para permitir acesso do front-end
app.use(express.json());             // Habilita parse de JSON no corpo das requisições

// 🔹 Rota base para teste rápido
app.get("/", (req, res) => {
  res.send("API Kanban rodando 🚀");
});

// 🔹 Rotas da aplicação
app.use("/cards",       require("./routes/cardRoutes"));       // Rotas de cards
app.use("/users",       require("./routes/userRoutes"));       // Rotas de usuários
app.use("/schedules",   require("./routes/scheduleRoutes"));   // Rotas de agendamentos
app.use("/technicians", require("./routes/technicianRoutes")); // Rotas de técnicos

// 🔹 Exporta app para ser usado no server principal ou testes
module.exports = app;