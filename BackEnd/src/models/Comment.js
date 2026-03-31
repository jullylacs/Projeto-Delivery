const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// 🔹 Model de comentários (separado do Card - melhor para escala)
const Comment = sequelize.define("Comment", {

  // Referência ao card ao qual o comentário pertence
  // Equivalente ao: card: { type: ObjectId, ref: "Card" } do Mongoose
  card_id: {
    type: DataTypes.INTEGER,
    references: { model: "cards", key: "id" },
    onDelete: "CASCADE", // Se o card for deletado, apaga os comentários junto
    allowNull: false
  },

  // Referência ao usuário que fez o comentário
  // Equivalente ao: usuario: { type: ObjectId, ref: "User" } do Mongoose
  usuario_id: {
    type: DataTypes.INTEGER,
    references: { model: "users", key: "id" },
    onDelete: "SET NULL",
    allowNull: true
  },

  // Conteúdo da mensagem do comentário
  mensagem: {
    type: DataTypes.TEXT,
    allowNull: false
  }

}, {
  tableName: "comments",
  timestamps: true // createdAt e updatedAt automáticos
});

module.exports = Comment;