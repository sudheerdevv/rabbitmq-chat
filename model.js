const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  room: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const roomSchema = new mongoose.Schema({
  name: String,
  messages: [messageSchema],
});

const Room = mongoose.model("Room", roomSchema);
const Message = mongoose.model("Message", messageSchema);

module.exports = { Room, Message };
