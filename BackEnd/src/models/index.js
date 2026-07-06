const sequelize = require("../config/db");

// 🔹 Importa todos os models
const User       = require("./User");
const Card       = require("./Card");
const Column     = require("./Column");
const Comment    = require("./Comment");
const Schedule   = require("./Schedule");
const Technician = require("./Technician");
const Notification = require("./Notification");
const RefreshToken = require("./RefreshToken");
const Role = require("./Role");
const AgendaEvento = require("./AgendaEvento");
const Nota         = require("./Nota");
const Ativacao     = require("./Ativacao");

// ─────────────────────────────────────────────
// 🔗 Associações (equivalente aos ref: do Mongoose)
// ─────────────────────────────────────────────

// Card pertence a um User (vendedor)
Card.belongsTo(User, { foreignKey: "vendedor_id", as: "vendedor" });
User.hasMany(Card,   { foreignKey: "vendedor_id", as: "cards" });

// Card pertence a uma Column
Card.belongsTo(Column, { foreignKey: "coluna_id", as: "column" });
Column.hasMany(Card,   { foreignKey: "coluna_id", as: "cards" });

// Comment pertence a um Card
Comment.belongsTo(Card, { foreignKey: "card_id", as: "card" });
Card.hasMany(Comment,   { foreignKey: "card_id", as: "commentRecords" });

// Comment pertence a um User (autor)
Comment.belongsTo(User, { foreignKey: "usuario_id", as: "usuario" });
User.hasMany(Comment,   { foreignKey: "usuario_id", as: "comentarios" });

// Schedule pertence a um Card
Schedule.belongsTo(Card, { foreignKey: "card_id", as: "card" });
Card.hasMany(Schedule,   { foreignKey: "card_id", as: "schedules" });

// Schedule pertence a um Technician
Schedule.belongsTo(Technician, { foreignKey: "tecnico_id", as: "tecnico" });
Technician.hasMany(Schedule,   { foreignKey: "tecnico_id", as: "schedules" });

// Notification pertence a um User e opcionalmente a um Card
Notification.belongsTo(User, { foreignKey: "usuario_id", as: "user" });
User.hasMany(Notification,   { foreignKey: "usuario_id", as: "notifications" });

Notification.belongsTo(Card, { foreignKey: "card_id", as: "card" });
Card.hasMany(Notification,   { foreignKey: "card_id", as: "notifications" });

// RefreshToken pertence a um User
RefreshToken.belongsTo(User, { foreignKey: "usuario_id", as: "user" });
User.hasMany(RefreshToken,   { foreignKey: "usuario_id", as: "refreshTokens" });

// AgendaEvento pertence a um User
AgendaEvento.belongsTo(User, { foreignKey: "usuario_id", as: "usuario" });
User.hasMany(AgendaEvento,   { foreignKey: "usuario_id", as: "agendaEventos" });

// Nota pertence a um User
Nota.belongsTo(User, { foreignKey: "usuario_id", as: "usuario" });
User.hasMany(Nota,   { foreignKey: "usuario_id", as: "notas" });

// Ativacao pertence a um Technician
Ativacao.belongsTo(Technician, { foreignKey: "tecnico_id", as: "tecnico" });
Technician.hasMany(Ativacao,   { foreignKey: "tecnico_id", as: "ativacoes" });

// Ativacao foi criada e (opcionalmente) aprovada por Users
Ativacao.belongsTo(User, { foreignKey: "criado_por", as: "criador" });
User.hasMany(Ativacao,   { foreignKey: "criado_por", as: "ativacoesCriadas" });

Ativacao.belongsTo(User, { foreignKey: "aprovado_por", as: "aprovador" });
User.hasMany(Ativacao,   { foreignKey: "aprovado_por", as: "ativacoesAprovadas" });

// ─────────────────────────────────────────────
// 📤 Exporta tudo
// ─────────────────────────────────────────────
module.exports = { sequelize, User, Card, Column, Comment, Schedule, Technician, Notification, RefreshToken, Role, AgendaEvento, Nota, Ativacao };