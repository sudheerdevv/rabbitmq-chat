const amqp = require("amqplib");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const { Room, Message } = require("./model");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: "*" });

mongoose.connect("<MONGODB_URL>", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function connectRabbitMQ() {
  const connection = await amqp.connect("amqp://<YOUR_HOST>:<YOUR_PORT>");
  const channel = await connection.createChannel();

  return { connection, channel };
}

async function startServer() {
  const { channel } = await connectRabbitMQ();

  io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("join room", async (room) => {
      console.log(`User joined room: ${room}`);
      socket.join(room);

      await channel.assertQueue(room);

      const roomData = await Room.findOne({ name: room });
      if (roomData) {
        roomData.messages.forEach((msg) => {
          socket.emit("chat message", msg.message);
        });
      } else {
        await Room.create({ name: room });
      }

      channel.consume(room, (msg) => {
        if (msg !== null) {
          io.to(room).emit("chat message", msg.content.toString());
          channel.ack(msg);
        }
      });
    });

    socket.on("chat message", async ({ room, message }) => {
      await channel.sendToQueue(room, Buffer.from(message));

      const roomData = await Room.findOne({ name: room });
      if (roomData) {
        roomData.messages.push(new Message({ room, message }));
        await roomData.save();
      }
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });

  server.listen(3000, () => {
    console.log("listening on *:3000");
  });
}

startServer().catch(console.warn);
