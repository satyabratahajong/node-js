const { json } = require("body-parser");
const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;
const clients = new Map();

app.use(express.static(path.join(__dirname, "public")));

function broadcast(message) {
  const data = JSON.stringify(message);

  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

function broadcastUserCount() {
  broadcast({
    type: "userCount",
    count: clients.size
  });
}

wss.on("connection", (socket) => {
  let username = null;

  socket.send(
    JSON.stringify({
      type: "system",
      text: "Connected to the chat server."
    })
  );

  socket.on("message", (rawMessage) => {
    try {
      const message = JSON.parse(rawMessage.toString());

      if (message.type === "join") {
        username = String(message.username || "Anonymous")
          .trim()
          .slice(0, 20);

        if (!username) {
          username = "Anonymous";
        }

        clients.set(socket, username);

        broadcast({
          type: "system",
          text: `${username} joined the chat.`
        });

        broadcastUserCount();
        return;
      }

      if (message.type === "chat") {
        if (!username) {
          socket.send(
            JSON.stringify({
              type: "error",
              text: "Join the chat before sending messages."
            })
          );
          return;
        }

        const text = String(message.text || "").trim();

        if (!text) {
          return;
        }

        broadcast({
          type: "chat",
          username,
          text: text.slice(0, 500),
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      socket.send(
        JSON.stringify({
          type: "error",
          text: "Invalid message format."
        })
      );
    }
  });

  socket.on("close", () => {
    if (username) {
      clients.delete(socket);

      broadcast({
        type: "system",
        text: `${username} left the chat.`
      });

      broadcastUserCount();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chat app running at http://localhost:${PORT}`);
}); 