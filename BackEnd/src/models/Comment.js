const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Card"
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  mensagem: String
}, { timestamps: true });

module.exports = mongoose.model("Comment", CommentSchema);