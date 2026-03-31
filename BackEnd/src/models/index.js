const sequelize = require("../config/db");

// 🔹 Importa todos os models
const User       = require("./User");
const Card       = require("./Card");
const Column     = require("./Column");
const Comment    = require("./Comment");
const Schedule   = require("./Schedule");
const Technician = require("./Technician");

// ─────────────────────────────────────────────
// 🔗 Associações (equivalente aos ref: do Mongoose)
// ─────────────────────────────────────────────

// Card pertence a um User (vendedor)
Card.belongsTo(User, { foreignKey: "vendedor_id", as: "vendedor" });
User.hasMany(Card,   { foreignKey: "vendedor_id", as: "cards" });

// Comment pertence a um Card
Comment.belongsTo(Card, { foreignKey: "card_id", as: "card" });
Card.hasMany(Comment,   { foreignKey: "card_id", as: "comments" });

// Comment pertence a um User (autor)
Comment.belongsTo(User, { foreignKey: "usuario_id", as: "usuario" });
User.hasMany(Comment,   { foreignKey: "usuario_id", as: "comentarios" });

// Schedule pertence a um Card
Schedule.belongsTo(Card, { foreignKey: "card_id", as: "card" });
Card.hasMany(Schedule,   { foreignKey: "card_id", as: "schedules" });

// Schedule pertence a um Technician
Schedule.belongsTo(Technician, { foreignKey: "tecnico_id", as: "tecnico" });
Technician.hasMany(Schedule,   { foreignKey: "tecnico_id", as: "schedules" });

// ─────────────────────────────────────────────
// 📤 Exporta tudo
// ─────────────────────────────────────────────
module.exports = { sequelize, User, Card, Column, Comment, Schedule, Technician };