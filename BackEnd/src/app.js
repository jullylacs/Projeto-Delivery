const express = require("express");
const cors = require("cors");
require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

// rota base
app.get("/", (req, res) => {
  res.send("API Kanban rodando 🚀");
});

// rotas
app.use("/cards", require("./routes/cardRoutes"));
app.use("/users", require("./routes/userRoutes"));
app.use("/schedules", require("./routes/scheduleRoutes"));
app.use("/technicians", require("./routes/technicianRoutes"));

module.exports = app;