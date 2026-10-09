// server.js
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server Running');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message.toString());
    } catch {
      parsedMessage = { text: message.toString() };
    }

    // Broadcast message to all connected clients except sender
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          sender: 'peer',
          data: parsedMessage,
          timestamp: new Date().toISOString(),
        }));
      }
    });
  });

  ws.on('close', () => console.log('Client disconnected'));
});

server.listen(8080, () => console.log('WS Server running on ws://localhost:8080'));
