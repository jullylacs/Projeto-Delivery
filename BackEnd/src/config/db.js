const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/delivery-kanban")
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.log(err));

module.exports = mongoose;